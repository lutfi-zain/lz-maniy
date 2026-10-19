import { describe, it, expect } from 'vitest';
import {
	createConversation,
	getConversation,
	listConversations,
	deleteConversation,
	insertMessage,
	listMessages,
	enqueueEvalJob,
	leasePendingEvalJobs,
	reapStaleProcessingJobs,
	updateEvalJobStatus,
	stageEvalCandidate,
	listStagedEvalCandidates,
	updateCandidateStatus,
	type DBEvalQueueJob,
	type DBEvalCandidate
} from '../../db/queries.js';

interface MockStore {
	conversations: Record<string, unknown>[];
	messages: Record<string, unknown>[];
	eval_queue: DBEvalQueueJob[];
	eval_dataset_candidates: DBEvalCandidate[];
}

interface MockD1Database {
	store: MockStore;
	prepare: (sql: string) => {
		bind: (...args: unknown[]) => any;
		run: () => Promise<{ meta?: { changes?: number } }>;
		first: () => Promise<unknown>;
		all: () => Promise<{ results?: unknown[] }>;
	};
}

function createMockD1(): D1Database & { store: MockStore } {
	const store: MockStore = {
		conversations: [],
		messages: [],
		eval_queue: [],
		eval_dataset_candidates: []
	};

	const db: MockD1Database = {
		store,
		prepare(sql: string) {
			let boundArgs: unknown[] = [];
			return {
				bind(...args: unknown[]) {
					boundArgs = args;
					return this;
				},
				async run() {
					if (sql.includes('INSERT INTO conversations')) {
						const [id, user_id, title, model, provider, created_at, updated_at] = boundArgs as [string, string, string, string, string, number, number];
						store.conversations.push({ id, user_id, title, model, provider, created_at, updated_at });
						return { meta: { changes: 1 } };
					}
					if (sql.includes('INSERT INTO messages')) {
						const [id, conversation_id, role, content, tool_calls, tool_results, image_ref, created_at] = boundArgs as [string, string, string, string, string, string, string, number];
						store.messages.push({ id, conversation_id, role, content, tool_calls, tool_results, image_ref, created_at });
						return { meta: { changes: 1 } };
					}
					if (sql.includes('DELETE FROM conversations')) {
						const [id, user_id] = boundArgs as [string, string];
						const len = store.conversations.length;
						store.conversations = store.conversations.filter(c => !(c.id === id && c.user_id === user_id));
						return { meta: { changes: len - store.conversations.length } };
					}
					if (sql.includes('INSERT INTO eval_queue')) {
						const [id, trace_id, session_id, user_id, priority, user_message, assistant_output, tool_results_json, trigger_reason, created_at] = boundArgs as [string, string, string, string, 'high' | 'normal', string, string, string | null, string, number];
						store.eval_queue.push({
							id,
							trace_id,
							session_id,
							user_id,
							priority,
							status: 'pending',
							user_message,
							assistant_output,
							tool_results_json,
							trigger_reason,
							attempts: 0,
							last_error: null,
							locked_at: null,
							created_at,
							processed_at: null
						});
						return { meta: { changes: 1 } };
					}
					if (sql.includes('UPDATE eval_queue') && sql.includes("SET status = 'pending'")) {
						const [threshold] = boundArgs as [number];
						let changes = 0;
						for (const j of store.eval_queue) {
							if (j.status === 'processing' && j.locked_at !== null && j.locked_at < threshold) {
								j.status = 'pending';
								j.locked_at = null;
								j.attempts += 1;
								changes += 1;
							}
						}
						return { meta: { changes } };
					}
					if (sql.includes('UPDATE eval_queue') && sql.includes("SET status = 'processing'")) {
						const [locked_at, id] = boundArgs as [number, string];
						const job = store.eval_queue.find(j => j.id === id && j.status === 'pending');
						if (job) {
							job.status = 'processing';
							job.locked_at = locked_at;
							job.attempts += 1;
							return { meta: { changes: 1 } };
						}
						return { meta: { changes: 0 } };
					}
					if (sql.includes('UPDATE eval_queue') && sql.includes('processed_at = ?')) {
						const [status, processed_at, last_error, id] = boundArgs as [DBEvalQueueJob['status'], number, string | null, string];
						const job = store.eval_queue.find(j => j.id === id);
						if (job) {
							job.status = status;
							job.processed_at = processed_at;
							job.last_error = last_error;
							job.locked_at = null;
							return { meta: { changes: 1 } };
						}
						return { meta: { changes: 0 } };
					}
					if (sql.includes('INSERT INTO eval_dataset_candidates')) {
						const [id, source_trace_id, source_session_id, evaluator_rubric, domain_category, sanitized_prompt, sanitized_output, sanitized_tool_calls_json, judge_score, judge_reasoning, created_at] = boundArgs as [string, string, string, string, string, string, string, string | null, number, string, number];
						store.eval_dataset_candidates.push({
							id,
							source_trace_id,
							source_session_id,
							evaluator_rubric,
							domain_category,
							sanitized_prompt,
							sanitized_output,
							sanitized_tool_calls_json,
							judge_score,
							judge_reasoning,
							status: 'staged',
							created_at
						});
						return { meta: { changes: 1 } };
					}
					if (sql.includes('UPDATE eval_dataset_candidates SET status = ?')) {
						const [status, id] = boundArgs as [DBEvalCandidate['status'], string];
						const cand = store.eval_dataset_candidates.find(c => c.id === id);
						if (cand) {
							cand.status = status;
							return { meta: { changes: 1 } };
						}
						return { meta: { changes: 0 } };
					}
					return { meta: { changes: 0 } };
				},
				async first() {
					if (sql.includes('SELECT * FROM conversations WHERE id = ?')) {
						const [id, user_id] = boundArgs as [string, string];
						return store.conversations.find(c => c.id === id && c.user_id === user_id) ?? null;
					}
					return null;
				},
				async all() {
					if (sql.includes('SELECT * FROM conversations WHERE user_id = ?')) {
						const [user_id] = boundArgs as [string];
						const results = store.conversations.filter(c => c.user_id === user_id);
						return { results };
					}
					if (sql.includes('SELECT * FROM messages WHERE conversation_id = ?')) {
						const [conversation_id] = boundArgs as [string];
						const results = store.messages.filter(m => m.conversation_id === conversation_id);
						return { results };
					}
					if (sql.includes('SELECT * FROM eval_queue WHERE status = ?') || sql.includes("SELECT * FROM eval_queue WHERE status = 'pending'")) {
						let list = store.eval_queue.filter(j => j.status === 'pending');
						list.sort((a, b) => {
							if (a.priority === b.priority) return a.created_at - b.created_at;
							return a.priority === 'high' ? -1 : 1;
						});
						const limit = boundArgs[boundArgs.length - 1] as number;
						return { results: list.slice(0, typeof limit === 'number' ? limit : 5) };
					}
					if (sql.includes('SELECT * FROM eval_dataset_candidates WHERE status = ?') || sql.includes("SELECT * FROM eval_dataset_candidates WHERE status = 'staged'")) {
						const limit = boundArgs[0] as number;
						const list = store.eval_dataset_candidates.filter(c => c.status === 'staged');
						return { results: list.slice(0, typeof limit === 'number' ? limit : 50) };
					}
					return { results: [] };
				}
			};
		}
	};

	return db as unknown as D1Database & { store: MockStore };
}

describe('D1 Queries with Mock DB', () => {
	it('creates and lists conversations', async () => {
		const db = createMockD1();
		await createConversation(db, {
			id: 'conv-1',
			userId: 'user-1',
			title: 'Percakapan Pertama',
			model: 'gemini-1.5-flash',
			provider: 'gemini'
		});

		const list = await listConversations(db, 'user-1');
		expect(list.length).toBe(1);
		expect(list[0].id).toBe('conv-1');
		expect(list[0].title).toBe('Percakapan Pertama');
	});

	it('inserts and retrieves messages', async () => {
		const db = createMockD1();
		await insertMessage(db, {
			id: 'msg-1',
			conversationId: 'conv-1',
			role: 'user',
			content: 'Halo Eve'
		});

		const messages = await listMessages(db, 'conv-1');
		expect(messages.length).toBe(1);
		expect(messages[0].content).toBe('Halo Eve');
		expect(messages[0].role).toBe('user');
	});

	it('deletes conversation', async () => {
		const db = createMockD1();
		await createConversation(db, {
			id: 'conv-1',
			userId: 'user-1',
			title: 'Percakapan',
			model: 'gemini-1.5-flash',
			provider: 'gemini'
		});

		const deleted = await deleteConversation(db, 'conv-1', 'user-1');
		expect(deleted).toBe(true);

		const conv = await getConversation(db, 'conv-1', 'user-1');
		expect(conv).toBeNull();
	});

	describe('Evaluation Queue & Flywheel Queries', () => {
		it('enqueues and leases eval jobs with priority ordering', async () => {
			const db = createMockD1();
			await enqueueEvalJob(db, {
				traceId: 'tr-normal',
				sessionId: 'sess-1',
				userId: 'u-1',
				priority: 'normal',
				userMessage: 'Halo normal',
				assistantOutput: 'Respon normal',
				triggerReason: 'random_sample'
			});

			await enqueueEvalJob(db, {
				traceId: 'tr-high',
				sessionId: 'sess-2',
				userId: 'u-2',
				priority: 'high',
				userMessage: 'Halo error',
				assistantOutput: 'Respon error',
				triggerReason: 'negative_feedback'
			});

			const leased = await leasePendingEvalJobs(db, 5);
			expect(leased.length).toBe(2);
			// High priority must come first
			expect(leased[0].trace_id).toBe('tr-high');
			expect(leased[0].status).toBe('processing');
			expect(leased[0].attempts).toBe(1);

			expect(leased[1].trace_id).toBe('tr-normal');
			expect(leased[1].status).toBe('processing');
		});

		it('reaps stale processing jobs older than threshold', async () => {
			const db = createMockD1();
			const job = await enqueueEvalJob(db, {
				traceId: 'tr-stale',
				sessionId: 'sess-stale',
				userId: 'u-stale',
				userMessage: 'Pesan',
				assistantOutput: 'Respon',
				triggerReason: 'code_eval_failure'
			});

			// Manually simulate a job locked 700 seconds ago
			const qJob = db.store.eval_queue.find(j => j.id === job.id);
			expect(qJob).toBeDefined();
			if (qJob) {
				qJob.status = 'processing';
				qJob.locked_at = Math.floor(Date.now() / 1000) - 700;
			}

			const reaped = await reapStaleProcessingJobs(db, 600);
			expect(reaped).toBe(1);
			expect(qJob?.status).toBe('pending');
			expect(qJob?.locked_at).toBeNull();
			expect(qJob?.attempts).toBe(1);
		});

		it('updates job status and stages candidates', async () => {
			const db = createMockD1();
			const job = await enqueueEvalJob(db, {
				traceId: 'tr-1',
				sessionId: 'sess-1',
				userId: 'u-1',
				userMessage: 'Test',
				assistantOutput: 'Respon',
				triggerReason: 'negative_feedback'
			});

			await updateEvalJobStatus(db, job.id, 'completed');
			expect(db.store.eval_queue[0].status).toBe('completed');
			expect(db.store.eval_queue[0].processed_at).toBeTypeOf('number');

			const candidate = await stageEvalCandidate(db, {
				sourceTraceId: 'tr-1',
				sourceSessionId: 'sess-1',
				evaluatorRubric: 'financial_soundness',
				domainCategory: 'financial_sanity',
				sanitizedPrompt: 'Berapa kas bebas?',
				sanitizedOutput: 'Kas bebas Anda...',
				judgeScore: 0.2,
				judgeReasoning: 'Deficit safe-to-spend was ignored.'
			});

			expect(candidate.status).toBe('staged');
			const staged = await listStagedEvalCandidates(db, 10);
			expect(staged.length).toBe(1);
			expect(staged[0].domain_category).toBe('financial_sanity');

			await updateCandidateStatus(db, candidate.id, 'synced_remote');
			expect(db.store.eval_dataset_candidates[0].status).toBe('synced_remote');
		});
	});
});
