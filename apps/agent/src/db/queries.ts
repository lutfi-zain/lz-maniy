/// <reference types="@cloudflare/workers-types" />
import type { ChatMessage, ConversationMeta } from '@maniyy/shared';

export interface DBConversation {
	id: string;
	user_id: string;
	title: string;
	model: string;
	provider: string;
	created_at: number;
	updated_at: number;
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
	const result = await db
		.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
		.bind(conversationId)
		.all<DBMessage>();
	return (result.results ?? []).map(rowToMessage);
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
