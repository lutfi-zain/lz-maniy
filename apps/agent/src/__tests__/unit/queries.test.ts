import { describe, it, expect } from 'vitest';
import {
	createConversation,
	getConversation,
	listConversations,
	deleteConversation,
	insertMessage,
	listMessages
} from '../../db/queries.js';

// Mock D1 Database for unit-style verification of query shape
function createMockD1() {
	const store = {
		conversations: [] as Record<string, unknown>[],
		messages: [] as Record<string, unknown>[]
	};

	return {
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
					return { results: [] };
				}
			};
		}
	} as unknown as D1Database;
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
});
