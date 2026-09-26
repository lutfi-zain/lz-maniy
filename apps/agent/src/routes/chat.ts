import { Hono } from 'hono';
import { streamText } from 'ai';
import { authMiddleware } from '../middleware/auth.js';
import { getModel, AVAILABLE_MODELS } from '../agent/models.js';
import { buildSystemPrompt } from '../agent/system-prompt.js';
import { createFinancialTools } from '../agent/tools/financial.js';
import { createMutationTools } from '../agent/tools/mutations.js';
import { createUICommandTools } from '../agent/tools/ui-commands.js';
import {
	createConversation,
	getConversation,
	listMessages,
	insertMessage,
	touchConversation
} from '../db/queries.js';
import type { Env } from '../types.js';
import type { ChatStreamRequest } from '@maniyy/shared';

const chatRouter = new Hono<{ Bindings: Env }>();

chatRouter.use('*', authMiddleware);

chatRouter.post('/', async (c) => {
	const user = c.get('user');
	const body = await c.req.json<ChatStreamRequest>();

	if (!body.message?.trim() && !body.image) {
		return c.json({ error: 'bad_request', message: 'Message is required' }, 400);
	}

	// Resolve model
	const requestedProvider = body.model?.provider ?? 'groq';
	const requestedModel = body.model?.model ?? 'openai/gpt-oss-20b';
	const modelConfig = AVAILABLE_MODELS.find(
		(m) => m.provider === requestedProvider && m.model === requestedModel
	) ?? AVAILABLE_MODELS[0];

	const aiModel = getModel(c.env, modelConfig.provider, modelConfig.model);

	// Resolve or create conversation
	let conversationId = body.conversationId;
	let isNewConversation = false;
	if (conversationId) {
		const existing = await getConversation(c.env.DB, conversationId, user.userId);
		if (!existing) {
			conversationId = undefined;
		}
	}
	if (!conversationId) {
		conversationId = crypto.randomUUID();
		const title = body.message.slice(0, 50) + (body.message.length > 50 ? '...' : '');
		await createConversation(c.env.DB, {
			id: conversationId,
			userId: user.userId,
			title,
			model: modelConfig.model,
			provider: modelConfig.provider
		});
		isNewConversation = true;
	}

	// Persist user message
	const userMsgId = crypto.randomUUID();
	await insertMessage(c.env.DB, {
		id: userMsgId,
		conversationId,
		role: 'user',
		content: body.message,
		imageRef: body.image ? 'ephemeral-image' : undefined
	});

	// Load conversation history for context
	const history = await listMessages(c.env.DB, conversationId);
	const prior = history.filter((m) => m.id !== userMsgId);
	type CoreMsg = { role: 'user' | 'assistant'; content: string };
	const priorMessages: CoreMsg[] = prior
		.filter((m) => m.role === 'user' || m.role === 'assistant')
		.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

	// Build current user message content
	type ContentPart =
		| { type: 'text'; text: string }
		| { type: 'image'; image: string; mimeType: string };
	const userContent: ContentPart[] = [{ type: 'text', text: body.message }];
	if (body.image && modelConfig.capabilities.vision) {
		userContent.push({ type: 'image', image: body.image.data, mimeType: body.image.mimeType });
	}

	const tools = {
		...createFinancialTools(c.env.REEDRICH_API_URL, user.accessToken, c.env.REEDRICH),
		...createMutationTools(c.env.REEDRICH_API_URL, user.accessToken, c.env.REEDRICH),
		...createUICommandTools()
	};

	const systemPrompt = buildSystemPrompt(body.pageContext, user.fullName);
	const activeConvId = conversationId!;

	const result = streamText({
		model: aiModel,
		system: systemPrompt,
		messages: [
			...priorMessages,
			{ role: 'user', content: userContent }
		],
		tools,
		maxSteps: 8,
		onFinish: (ev) => {
			const finishTask = async () => {
				const finalContent = ev.text || '';
				if (finalContent) {
					await insertMessage(c.env.DB, {
						id: crypto.randomUUID(),
						conversationId: activeConvId,
						role: 'assistant',
						content: finalContent
					});
					await touchConversation(c.env.DB, activeConvId);
				}
			};
			c.executionCtx.waitUntil(finishTask());
		}
	});

	return result.toDataStreamResponse({
		getErrorMessage: (err) => (err as Error)?.message || String(err),
		headers: {
			'X-Conversation-Id': activeConvId,
			'X-Is-New-Conversation': isNewConversation ? '1' : '0',
			'Access-Control-Expose-Headers': 'X-Conversation-Id, X-Is-New-Conversation'
		}
	});
});

export { chatRouter };
