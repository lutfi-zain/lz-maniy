import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import {
	listConversations,
	getConversation,
	deleteConversation,
	listMessages,
	bulkInsertConversationWithMessages
} from '../db/queries.js';
import type { Env } from '../types.js';
import type { ExportedConversation } from '@maniyy/shared';

const conversationsRouter = new Hono<{ Bindings: Env }>();

conversationsRouter.use('*', authMiddleware);

// GET /api/conversations
conversationsRouter.get('/', async (c) => {
	const user = c.get('user');
	const conversations = await listConversations(c.env.DB, user.userId);
	return c.json(conversations);
});

// GET /api/conversations/:id
conversationsRouter.get('/:id', async (c) => {
	const user = c.get('user');
	const id = c.req.param('id');
	const conversation = await getConversation(c.env.DB, id, user.userId);
	if (!conversation) return c.json({ error: 'not_found', message: 'Conversation not found' }, 404);
	const messages = await listMessages(c.env.DB, id);
	return c.json({ ...conversation, messages });
});

// DELETE /api/conversations/:id
conversationsRouter.delete('/:id', async (c) => {
	const user = c.get('user');
	const id = c.req.param('id');
	const deleted = await deleteConversation(c.env.DB, id, user.userId);
	if (!deleted) return c.json({ error: 'not_found', message: 'Conversation not found' }, 404);
	return new Response(null, { status: 204 });
});

// POST /api/conversations/export
conversationsRouter.post('/export', async (c) => {
	const user = c.get('user');
	const body = await c.req.json<{ conversationIds?: string[] }>().catch(() => ({}));
	const conversations = await listConversations(c.env.DB, user.userId);
	const filtered = body.conversationIds
		? conversations.filter((conv) => body.conversationIds!.includes(conv.id))
		: conversations;
	const exported: ExportedConversation[] = await Promise.all(
		filtered.map(async (conv) => ({
			...conv,
			messages: await listMessages(c.env.DB, conv.id)
		}))
	);
	return c.json(exported);
});

// POST /api/conversations/import
conversationsRouter.post('/import', async (c) => {
	const user = c.get('user');
	const body = await c.req.json<ExportedConversation[]>().catch(() => null);
	if (!Array.isArray(body)) {
		return c.json({ error: 'bad_request', message: 'Expected array of conversations' }, 400);
	}
	let imported = 0;
	let skipped = 0;
	for (const conv of body) {
		if (!conv.id || !conv.title || !Array.isArray(conv.messages)) {
			skipped++;
			continue;
		}
		try {
			const newId = crypto.randomUUID();
			await bulkInsertConversationWithMessages(
				c.env.DB,
				{
					id: newId,
					user_id: user.userId,
					title: conv.title,
					model: conv.model ?? 'gemini-1.5-flash',
					provider: conv.provider ?? 'gemini',
					created_at: conv.createdAt ?? Date.now(),
					updated_at: conv.updatedAt ?? Date.now()
				},
				conv.messages.map((m) => ({
					id: crypto.randomUUID(),
					conversation_id: newId,
					role: m.role,
					content: m.content ?? '',
					tool_calls: m.toolCalls ? JSON.stringify(m.toolCalls) : null,
					tool_results: m.toolResults ? JSON.stringify(m.toolResults) : null,
					image_ref: m.imageRef ?? null,
					created_at: m.timestamp ?? Date.now()
				}))
			);
			imported++;
		} catch {
			skipped++;
		}
	}
	return c.json({ imported, skipped });
});

export { conversationsRouter };
