/// <reference types="@cloudflare/workers-types" />
import type { ChatMessage, ConversationMeta, UserSettings, AgentMemory } from '@maniy/shared';

export interface DBConversation {
	id: string;
	user_id: string;
	title: string;
	model: string;
	provider: string;
	created_at: number;
	updated_at: number;
	compacted_at?: number | null;
	compaction_summary?: string | null;
}

export interface DBMessage {
	id: string;
	conversation_id: string;
	role: string;
	content: string | null;
	tool_calls: string | null;
	tool_results: string | null;
	image_ref: string | null;
	created_at: number;
}

function rowToConversation(row: DBConversation): ConversationMeta {
	return {
		id: row.id,
		title: row.title,
		model: row.model,
		provider: row.provider,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

function rowToMessage(row: DBMessage): ChatMessage {
	return {
		id: row.id,
		conversationId: row.conversation_id,
		role: row.role as ChatMessage['role'],
		content: row.content ?? '',
		toolCalls: row.tool_calls ? (JSON.parse(row.tool_calls) as unknown[]) : undefined,
		toolResults: row.tool_results ? (JSON.parse(row.tool_results) as unknown[]) : undefined,
		imageRef: row.image_ref ?? undefined,
		timestamp: row.created_at
	};
}

export async function createConversation(
	db: D1Database,
	params: { id: string; userId: string; title: string; model: string; provider: string }
): Promise<ConversationMeta> {
	const now = Date.now();
	await db
		.prepare(
			'INSERT INTO conversations (id, user_id, title, model, provider, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
		)
		.bind(params.id, params.userId, params.title, params.model, params.provider, now, now)
		.run();
	return { id: params.id, title: params.title, model: params.model, provider: params.provider, createdAt: now, updatedAt: now };
}

export async function listConversations(db: D1Database, userId: string): Promise<ConversationMeta[]> {
	const result = await db
		.prepare('SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 100')
		.bind(userId)
		.all<DBConversation>();
	return (result.results ?? []).map(rowToConversation);
}

export async function getConversation(
	db: D1Database,
	id: string,
	userId: string
): Promise<ConversationMeta | null> {
	const row = await db
		.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?')
		.bind(id, userId)
		.first<DBConversation>();
	return row ? rowToConversation(row) : null;
}

export async function updateConversationTitle(
	db: D1Database,
	id: string,
	userId: string,
	title: string
): Promise<void> {
	await db
		.prepare('UPDATE conversations SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?')
		.bind(title, Date.now(), id, userId)
		.run();
}

export async function touchConversation(db: D1Database, id: string): Promise<void> {
	await db
		.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?')
		.bind(Date.now(), id)
		.run();
}

export async function deleteConversation(db: D1Database, id: string, userId: string): Promise<boolean> {
	const result = await db
		.prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?')
		.bind(id, userId)
		.run();
	return (result.meta.changes ?? 0) > 0;
}

export async function insertMessage(
	db: D1Database,
	msg: {
		id: string;
		conversationId: string;
		role: string;
		content: string;
		toolCalls?: unknown[];
		toolResults?: unknown[];
		imageRef?: string;
	}
): Promise<void> {
	await db
		.prepare(
			'INSERT INTO messages (id, conversation_id, role, content, tool_calls, tool_results, image_ref, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
		)
		.bind(
			msg.id,
			msg.conversationId,
			msg.role,
			msg.content,
			msg.toolCalls ? JSON.stringify(msg.toolCalls) : null,
			msg.toolResults ? JSON.stringify(msg.toolResults) : null,
			msg.imageRef ?? null,
			Date.now()
		)
		.run();
}

export async function listMessages(db: D1Database, conversationId: string): Promise<ChatMessage[]> {
	// Check if conversation has a compaction summary
	const conv = await db
		.prepare('SELECT compacted_at, compaction_summary FROM conversations WHERE id = ?')
		.bind(conversationId)
		.first<{ compacted_at: number | null; compaction_summary: string | null }>();

	let query = 'SELECT * FROM messages WHERE conversation_id = ?';
	const bindings: unknown[] = [conversationId];

	if (conv?.compacted_at) {
		query += ' AND created_at >= ?';
		bindings.push(conv.compacted_at);
	}
	query += ' ORDER BY created_at ASC';

	const result = await db.prepare(query).bind(...bindings).all<DBMessage>();
	const messages = (result.results ?? []).map(rowToMessage);

	if (conv?.compaction_summary) {
		const summaryMessage: ChatMessage = {
			id: `summary-${conversationId}`,
			conversationId,
			role: 'system',
			content: `[Conversation Summary]\n${conv.compaction_summary}`,
			timestamp: conv.compacted_at ?? Date.now()
		};
		return [summaryMessage, ...messages];
	}

	return messages;
}

export async function setConversationCompaction(
	db: D1Database,
	conversationId: string,
	summary: string,
	compactedAt: number
): Promise<void> {
	await db
		.prepare('UPDATE conversations SET compacted_at = ?, compaction_summary = ? WHERE id = ?')
		.bind(compactedAt, summary, conversationId)
		.run();
}

export async function bulkInsertConversationWithMessages(
	db: D1Database,
	conversation: Omit<DBConversation, 'user_id'> & { user_id: string },
	messages: Array<Omit<DBMessage, 'conversation_id'> & { conversation_id: string }>
): Promise<void> {
	const stmts = [
		db.prepare(
			'INSERT OR IGNORE INTO conversations (id, user_id, title, model, provider, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
		).bind(conversation.id, conversation.user_id, conversation.title, conversation.model, conversation.provider, conversation.created_at, conversation.updated_at),
		...messages.map((m) =>
			db.prepare(
				'INSERT OR IGNORE INTO messages (id, conversation_id, role, content, tool_calls, tool_results, image_ref, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
			).bind(m.id, m.conversation_id, m.role, m.content, m.tool_calls, m.tool_results, m.image_ref, m.created_at)
		)
	];
	await db.batch(stmts);
}
export const DEFAULT_USER_SETTINGS: UserSettings = {
	ledgerViewMode: 'single',
	activePeriods: []
};

export async function getUserSettings(db: D1Database, userId: string): Promise<UserSettings> {
	const row = await db
		.prepare('SELECT settings_json FROM user_settings WHERE user_id = ?')
		.bind(userId)
		.first<{ settings_json: string }>();

	if (!row?.settings_json) {
		return { ...DEFAULT_USER_SETTINGS };
	}

	try {
		const parsed = JSON.parse(row.settings_json) as Partial<UserSettings>;
		return {
			...DEFAULT_USER_SETTINGS,
			...parsed
		};
	} catch {
		return { ...DEFAULT_USER_SETTINGS };
	}
}

export async function upsertUserSettings(
	db: D1Database,
	userId: string,
	partialSettings: Partial<UserSettings>
): Promise<UserSettings> {
	const current = await getUserSettings(db, userId);
	const merged: UserSettings = {
		...current,
		...partialSettings
	};
	const jsonStr = JSON.stringify(merged);
	const now = Date.now();

	await db
		.prepare(
			`INSERT INTO user_settings (user_id, settings_json, updated_at)
			 VALUES (?, ?, ?)
			 ON CONFLICT(user_id) DO UPDATE SET
			   settings_json = excluded.settings_json,
			   updated_at = excluded.updated_at`
		)
		.bind(userId, jsonStr, now)
		.run();

	return merged;
}

export const DEFAULT_AGENT_MEMORY: AgentMemory = {
	walletNicknames: {},
	cashflowPattern: '',
	formattingPreferences: [],
	customContext: ''
};

interface DBAgentMemoryRow {
	user_id: string;
	wallet_nicknames: string;
	cashflow_pattern: string;
	formatting_preferences: string;
	custom_context: string;
	updated_at: number;
}

export async function getAgentMemory(db: D1Database, userId: string): Promise<AgentMemory> {
	const row = await db
		.prepare('SELECT * FROM agent_memory WHERE user_id = ?')
		.bind(userId)
		.first<DBAgentMemoryRow>();

	if (!row) {
		return { ...DEFAULT_AGENT_MEMORY };
	}

	let walletNicknames = {};
	try {
		walletNicknames = JSON.parse(row.wallet_nicknames || '{}');
	} catch {
		/* ignore */
	}

	let formattingPreferences = [];
	try {
		formattingPreferences = JSON.parse(row.formatting_preferences || '[]');
	} catch {
		/* ignore */
	}

	return {
		walletNicknames,
		cashflowPattern: row.cashflow_pattern || '',
		formattingPreferences,
		customContext: row.custom_context || ''
	};
}

export async function upsertAgentMemory(
	db: D1Database,
	userId: string,
	partial: Partial<AgentMemory>
): Promise<AgentMemory> {
	const current = await getAgentMemory(db, userId);
	const merged: AgentMemory = {
		walletNicknames: { ...current.walletNicknames, ...partial.walletNicknames },
		cashflowPattern: partial.cashflowPattern !== undefined ? partial.cashflowPattern : current.cashflowPattern,
		formattingPreferences: partial.formattingPreferences !== undefined ? partial.formattingPreferences : current.formattingPreferences,
		customContext: partial.customContext !== undefined ? partial.customContext : current.customContext
	};

	const now = Date.now();
	await db
		.prepare(
			`INSERT INTO agent_memory (user_id, wallet_nicknames, cashflow_pattern, formatting_preferences, custom_context, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?)
			 ON CONFLICT(user_id) DO UPDATE SET
			   wallet_nicknames = excluded.wallet_nicknames,
			   cashflow_pattern = excluded.cashflow_pattern,
			   formatting_preferences = excluded.formatting_preferences,
			   custom_context = excluded.custom_context,
			   updated_at = excluded.updated_at`
		)
		.bind(
			userId,
			JSON.stringify(merged.walletNicknames || {}),
			merged.cashflowPattern || '',
			JSON.stringify(merged.formattingPreferences || []),
			merged.customContext || '',
			now
		)
		.run();

	return merged;
}

export interface DBEvalQueueJob {
	id: string;
	trace_id: string;
	session_id: string;
	user_id: string;
	priority: 'high' | 'normal';
	status: 'pending' | 'processing' | 'completed' | 'failed';
	user_message: string;
	assistant_output: string;
	tool_results_json: string | null;
	trigger_reason: string;
	attempts: number;
	last_error: string | null;
	locked_at: number | null;
	created_at: number;
	processed_at: number | null;
}

export interface DBEvalCandidate {
	id: string;
	source_trace_id: string;
	source_session_id: string;
	evaluator_rubric: string;
	domain_category: string;
	sanitized_prompt: string;
	sanitized_output: string;
	sanitized_tool_calls_json: string | null;
	judge_score: number;
	judge_reasoning: string;
	status: 'staged' | 'synced_remote' | 'exported_ci' | 'rejected';
	created_at: number;
}

export async function enqueueEvalJob(
	db: D1Database,
	params: {
		traceId: string;
		sessionId: string;
		userId: string;
		priority?: 'high' | 'normal';
		userMessage: string;
		assistantOutput: string;
		toolResultsJson?: string | null;
		triggerReason: string;
	}
): Promise<DBEvalQueueJob> {
	const id = crypto.randomUUID();
	const now = Date.now();
	const priority = params.priority || 'normal';
	const toolResultsJson = params.toolResultsJson ?? null;

	await db
		.prepare(
			`INSERT INTO eval_queue (
				id, trace_id, session_id, user_id, priority, status,
				user_message, assistant_output, tool_results_json, trigger_reason,
				attempts, created_at
			) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, 0, ?)`
		)
		.bind(
			id,
			params.traceId,
			params.sessionId,
			params.userId,
			priority,
			params.userMessage,
			params.assistantOutput,
			toolResultsJson,
			params.triggerReason,
			now
		)
		.run();

	return {
		id,
		trace_id: params.traceId,
		session_id: params.sessionId,
		user_id: params.userId,
		priority,
		status: 'pending',
		user_message: params.userMessage,
		assistant_output: params.assistantOutput,
		tool_results_json: toolResultsJson,
		trigger_reason: params.triggerReason,
		attempts: 0,
		last_error: null,
		locked_at: null,
		created_at: now,
		processed_at: null
	};
}

export async function reapStaleProcessingJobs(
	db: D1Database,
	maxStaleSeconds: number = 600
): Promise<number> {
	const staleThreshold = Math.floor(Date.now() / 1000) - maxStaleSeconds;
	const result = await db
		.prepare(
			`UPDATE eval_queue
			 SET status = 'pending', locked_at = NULL, attempts = attempts + 1
			 WHERE status = 'processing' AND locked_at IS NOT NULL AND locked_at < ?`
		)
		.bind(staleThreshold)
		.run();
	return result.meta?.changes ?? 0;
}

export async function leasePendingEvalJobs(
	db: D1Database,
	batchSize: number = 5,
	priorityFilter?: 'high' | 'normal'
): Promise<DBEvalQueueJob[]> {
	await reapStaleProcessingJobs(db);

	const nowEpoch = Math.floor(Date.now() / 1000);
	let query = `SELECT * FROM eval_queue WHERE status = 'pending'`;
	const bindings: (string | number)[] = [];

	if (priorityFilter) {
		query += ` AND priority = ?`;
		bindings.push(priorityFilter);
	}

	query += ` ORDER BY CASE priority WHEN 'high' THEN 1 ELSE 2 END ASC, created_at ASC LIMIT ?`;
	bindings.push(batchSize);

	const candidateRows = await db.prepare(query).bind(...bindings).all<DBEvalQueueJob>();
	const jobs = candidateRows.results ?? [];

	if (jobs.length === 0) return [];

	const leasedJobs: DBEvalQueueJob[] = [];
	for (const job of jobs) {
		const originalAttempts = job.attempts;
		const updateResult = await db
			.prepare(
				`UPDATE eval_queue
				 SET status = 'processing', locked_at = ?, attempts = attempts + 1
				 WHERE id = ? AND status = 'pending'`
			)
			.bind(nowEpoch, job.id)
			.run();

		if ((updateResult.meta?.changes ?? 0) > 0) {
			leasedJobs.push({
				...job,
				status: 'processing',
				locked_at: nowEpoch,
				attempts: originalAttempts + 1
			});
		}
	}

	return leasedJobs;
}

export async function updateEvalJobStatus(
	db: D1Database,
	id: string,
	status: 'completed' | 'failed',
	lastError?: string
): Promise<void> {
	const now = Date.now();
	await db
		.prepare(
			`UPDATE eval_queue
			 SET status = ?, processed_at = ?, last_error = ?, locked_at = NULL
			 WHERE id = ?`
		)
		.bind(status, now, lastError ?? null, id)
		.run();
}

/**
 * @walkthrough 05.07:dataset-flywheel
 * @topic Closed-Loop Dataset Persistence Queries
 * @ref https://developers.cloudflare.com/d1/ | okf://knowledge/ai-evals-course/fase-4-dataset-engineering-dan-synthetic-curation.md
 * @notes Helper query D1 untuk leasing antrean evaluasi dan staging kandidat dataset evaluasi.
 */
export async function stageEvalCandidate(
	db: D1Database,
	candidate: {
		sourceTraceId: string;
		sourceSessionId: string;
		evaluatorRubric: string;
		domainCategory: string;
		sanitizedPrompt: string;
		sanitizedOutput: string;
		sanitizedToolCallsJson?: string | null;
		judgeScore: number;
		judgeReasoning: string;
	}
): Promise<DBEvalCandidate> {
	const id = crypto.randomUUID();
	const now = Date.now();
	const toolCallsJson = candidate.sanitizedToolCallsJson ?? null;

	await db
		.prepare(
			`INSERT INTO eval_dataset_candidates (
				id, source_trace_id, source_session_id, evaluator_rubric, domain_category,
				sanitized_prompt, sanitized_output, sanitized_tool_calls_json,
				judge_score, judge_reasoning, status, created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'staged', ?)`
		)
		.bind(
			id,
			candidate.sourceTraceId,
			candidate.sourceSessionId,
			candidate.evaluatorRubric,
			candidate.domainCategory,
			candidate.sanitizedPrompt,
			candidate.sanitizedOutput,
			toolCallsJson,
			candidate.judgeScore,
			candidate.judgeReasoning,
			now
		)
		.run();

	return {
		id,
		source_trace_id: candidate.sourceTraceId,
		source_session_id: candidate.sourceSessionId,
		evaluator_rubric: candidate.evaluatorRubric,
		domain_category: candidate.domainCategory,
		sanitized_prompt: candidate.sanitizedPrompt,
		sanitized_output: candidate.sanitizedOutput,
		sanitized_tool_calls_json: toolCallsJson,
		judge_score: candidate.judgeScore,
		judge_reasoning: candidate.judgeReasoning,
		status: 'staged',
		created_at: now
	};
}

export async function listStagedEvalCandidates(
	db: D1Database,
	limit: number = 50
): Promise<DBEvalCandidate[]> {
	const res = await db
		.prepare(`SELECT * FROM eval_dataset_candidates WHERE status = 'staged' ORDER BY created_at ASC LIMIT ?`)
		.bind(limit)
		.all<DBEvalCandidate>();
	return res.results ?? [];
}

export async function updateCandidateStatus(
	db: D1Database,
	id: string,
	status: 'staged' | 'synced_remote' | 'exported_ci' | 'rejected'
): Promise<void> {
	await db
		.prepare(`UPDATE eval_dataset_candidates SET status = ? WHERE id = ?`)
		.bind(status, id)
		.run();
}
