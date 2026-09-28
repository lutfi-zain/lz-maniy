import { Hono } from 'hono';
import { streamText, type LanguageModelV1 } from 'ai';
import { authMiddleware } from '../middleware/auth.js';
import { getModel, AVAILABLE_MODELS } from '../agent/models.js';
import { buildSystemPrompt } from '../agent/system-prompt.js';
import { createFinancialTools } from '../agent/tools/financial.js';
import { createMutationTools } from '../agent/tools/mutations.js';
import { createUICommandTools } from '../agent/tools/ui-commands.js';
import { createGeminiRunner } from '../agent/gemini-native.js';
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
	const requestedProvider = body.model?.provider ?? 'gemini';
	const requestedModel = body.model?.model ?? 'gemini-3.1-flash-lite';
	const modelConfig = AVAILABLE_MODELS.find(
		(m) => m.provider === requestedProvider && m.model === requestedModel
	) ?? AVAILABLE_MODELS[0];

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

	const activeConvId = conversationId!;

	// Retrieve conversation history
	const history = await listMessages(c.env.DB, conversationId);
	const prior = history.filter((m) => m.id !== userMsgId);
	type CoreMsg = { role: 'user' | 'assistant'; content: string };
	const priorMessages: CoreMsg[] = prior
		.filter((m) => m.role === 'user' || m.role === 'assistant')
		.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

	// Route to native Gemini Runner if Gemini provider is selected
	if (modelConfig.provider === 'gemini') {
		const runner = createGeminiRunner(
			c.env.GEMINI_API_KEY,
			c.env.REEDRICH_API_URL,
			user.accessToken,
			c.env.REEDRICH
		);

		const stream = runner.runGeminiStream(
			modelConfig.model,
			body.message,
			body.pageContext,
			user.fullName,
			priorMessages,
			body.thinkingLevel
		);
		let fullAssistantText = '';

		const readable = new ReadableStream({
			async start(controller) {
				const encoder = new TextEncoder();
				try {
					for await (const chunk of stream) {
						if (chunk.startsWith('0:')) {
							try {
								const textDelta = JSON.parse(chunk.slice(2).trim());
								fullAssistantText += textDelta;
							} catch {
								/* ignore */
							}
						}
						controller.enqueue(encoder.encode(chunk));
					}
				} catch (err) {
					controller.enqueue(encoder.encode(`3:${JSON.stringify((err as Error).message)}\n`));
				} finally {
					controller.close();
					if (fullAssistantText) {
						c.executionCtx.waitUntil((async () => {
							await insertMessage(c.env.DB, {
								id: crypto.randomUUID(),
								conversationId: activeConvId,
								role: 'assistant',
								content: fullAssistantText
							});
							await touchConversation(c.env.DB, activeConvId);
						})());
					}
				}
			}
		});

		return new Response(readable, {
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
				'X-Conversation-Id': activeConvId,
				'X-Is-New-Conversation': isNewConversation ? '1' : '0',
				'Access-Control-Expose-Headers': 'X-Conversation-Id, X-Is-New-Conversation'
			}
		});
	}

	// Fallback to AI SDK for Groq / other providers
	const aiModel = getModel(c.env, modelConfig.provider, modelConfig.model);

	// History already retrieved above
	const tools = {
		...createFinancialTools(c.env.REEDRICH_API_URL, user.accessToken, c.env.REEDRICH),
		...createMutationTools(c.env.REEDRICH_API_URL, user.accessToken, c.env.REEDRICH),
		...createUICommandTools()
	};

	const systemPrompt = buildSystemPrompt(body.pageContext, user.fullName);

	const result = streamText({
		model: aiModel as unknown as LanguageModelV1,
		system: systemPrompt,
		messages: [
			...priorMessages,
			{ role: 'user', content: [{ type: 'text', text: body.message }] }
		],
		tools,
		maxSteps: 10,
		onFinish: (ev) => {
			c.executionCtx.waitUntil((async () => {
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
			})());
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
