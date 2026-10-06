import { Hono } from 'hono';
import { streamText, type LanguageModelV1 } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { authMiddleware } from '../middleware/auth.js';
import { getModel, AVAILABLE_MODELS } from '../agent/models.js';
import { buildSystemPrompt } from '../agent/system-prompt.js';
import { createFinancialTools } from '../agent/tools/financial.js';
import { createMutationTools } from '../agent/tools/mutations.js';
import { createWalletTools } from '../agent/tools/wallet-management.js';
import { createBudgetTools } from '../agent/tools/budget-management.js';
import { createDebtLoanTools } from '../agent/tools/debt-loan.js';
import { createGoalTools } from '../agent/tools/goal-management.js';
import { createRecurringTools } from '../agent/tools/recurring.js';
import { createFeedbackTools } from '../agent/tools/feedback.js';
import { createMemoryTools } from '../agent/tools/memory.js';
import { createUICommandTools } from '../agent/tools/ui-commands.js';
import { createStatementTools } from '../agent/tools/statements.js';
import {
	createConversation,
	getConversation,
	listMessages,
	insertMessage,
	touchConversation,
	getAgentMemory
} from '../db/queries.js';
import {
	getOrCreateUserCredits,
	deductCredits,
	recordCreditTransaction,
	getCreditPricing,
	calculateCreditsUsed
} from '../db/credits.js';
import { estimateTokens, shouldCompact } from '../agent/compaction.js';
import { compactConversation } from '../agent/compaction-worker.js';
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

	// 1. Credit Pre-check
	const creditState = await getOrCreateUserCredits(c.env.DB, user.userId);
	if (creditState.balance <= 0) {
		return c.json(
			{
				error: 'insufficient_credits',
				message: 'Kredit habis. Hubungi admin untuk top-up.',
				balance: creditState.balance
			},
			402
		);
	}

	// 2. Resolve model (with legacy opencode fallback and default gemini-3.7-flash)
	let requestedProvider = body.model?.provider ?? 'omp';
	let requestedModel = body.model?.model ?? 'google-antigravity/gemini-3.7-flash';

	// Silent fallback for legacy opencode provider
	if ((requestedProvider as string) === 'opencode') {
		requestedProvider = 'omp';
		requestedModel = 'google-antigravity/gemini-3.7-flash';
	}

	let modelConfig =
		AVAILABLE_MODELS.find(
			(m) => m.provider === requestedProvider && m.model === requestedModel
		) ??
		AVAILABLE_MODELS.find((m) => m.model === 'google-antigravity/gemini-3.7-flash') ??
		AVAILABLE_MODELS[0];

	// Vision Fallback check: if image is present and model lacks vision, fallback to Groq qwen3.8-27b
	let isGroqVisionFallback = false;
	if (body.image && !modelConfig.capabilities.vision) {
		isGroqVisionFallback = true;
	}

	// 3. Resolve or create conversation
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

	// 4. Persist user message
	const userMsgId = crypto.randomUUID();
	await insertMessage(c.env.DB, {
		id: userMsgId,
		conversationId,
		role: 'user',
		content: body.message,
		imageRef: body.image ? 'ephemeral-image' : undefined
	});

	const activeConvId = conversationId!;

	// 5. Retrieve conversation history & check for auto-compaction
	let history = await listMessages(c.env.DB, activeConvId);
	const contextWindow = modelConfig.contextWindow ?? 1_000_000;
	const estimatedTokenCount = estimateTokens(history);

	if (shouldCompact(estimatedTokenCount, contextWindow)) {
		c.executionCtx.waitUntil(
			(async () => {
				await compactConversation(c.env.DB, c.env, activeConvId, history);
			})()
		);
		// Reload history after triggering compaction check
		history = await listMessages(c.env.DB, activeConvId);
	}

	const prior = history.filter((m) => m.id !== userMsgId);
	type CoreMsg = { role: 'user' | 'assistant'; content: string };
	const priorMessages: CoreMsg[] = prior
		.filter((m) => m.role === 'user' || m.role === 'assistant')
		.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

	// Retrieve agent memory
	const agentMemory = await getAgentMemory(c.env.DB, user.userId);

	// Resolve statement session reference (summary only, rows stay in KV)
	let statementSummary: string | null = null;
	if (body.statementSessionId && /^[0-9a-f-]{8,64}$/i.test(body.statementSessionId)) {
		const manifestRaw = await c.env.CONFIG.get(
			`stmt:${user.userId}:${body.statementSessionId}:manifest`
		);
		if (manifestRaw) {
			try {
				const manifest = JSON.parse(manifestRaw) as {
					files: Array<{ fileName: string; rowCount?: number; bank?: string }>;
					totalPages: number;
					totalRows: number;
				};
				const fileBits = manifest.files
					.map((f) => `${f.fileName} (${f.rowCount ?? 0} baris${f.bank ? `, ${f.bank}` : ''})`)
					.join('; ');
				statementSummary = `Konteks Rekening Koran: sesi ${body.statementSessionId} memuat ${manifest.totalRows} baris dari ${manifest.totalPages} halaman [${fileBits}]. Gunakan tool get_statement_rows untuk membaca baris bila perlu.`;
			} catch {
				statementSummary = null;
			}
		}
	}
	// Helper for credit settlement on stream completion
	const settleCredits = async (promptTokens: number, completionTokens: number) => {
		const pricing = await getCreditPricing(c.env.DB, modelConfig.model);
		const creditsUsed = calculateCreditsUsed(promptTokens, completionTokens, pricing);
		const remaining = await deductCredits(c.env.DB, user.userId, creditsUsed);
		await recordCreditTransaction(c.env.DB, {
			userId: user.userId,
			model: modelConfig.model,
			inputTokens: promptTokens,
			outputTokens: completionTokens,
			creditsUsed,
			conversationId: activeConvId
		});
		return { creditsUsed, creditsRemaining: remaining };
	};

	// 6. Route to native Gemini Runner if Gemini provider is selected
	if (modelConfig.provider === 'gemini') {
		const runner = createGeminiRunner(
			c.env.GEMINI_API_KEY,
			c.env.REEDRICH_API_URL,
			user.accessToken,
			c.env.REEDRICH,
			c.env.DB,
			user.userId,
			agentMemory,
			settleCredits,
			c.env.CONFIG
		);

		const stream = runner.runGeminiStream(
			modelConfig.model,
			body.message,
			body.pageContext,
			user.fullName,
			priorMessages,
			body.thinkingLevel,
			body.image,
			statementSummary
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
					c.executionCtx.waitUntil(
						(async () => {
							if (fullAssistantText) {
								await insertMessage(c.env.DB, {
									id: crypto.randomUUID(),
									conversationId: activeConvId,
									role: 'assistant',
									content: fullAssistantText
								});
								await touchConversation(c.env.DB, activeConvId);
							}
							// Credits are already settled inside Gemini runner before the stream finished
						})()
					);
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

	// 7. AI SDK Path (Groq / OMP Gateway)
	let aiModel: LanguageModelV1;
	let responseHeaders: Record<string, string> = {
		'X-Conversation-Id': activeConvId,
		'X-Is-New-Conversation': isNewConversation ? '1' : '0',
		'Access-Control-Expose-Headers': 'X-Conversation-Id, X-Is-New-Conversation, X-Model-Fallback'
	};

	if (isGroqVisionFallback) {
		const groqClient = createGroq({ apiKey: c.env.GROQ_API_KEY });
		aiModel = groqClient('qwen/qwen3.8-27b') as unknown as LanguageModelV1;
		responseHeaders['X-Model-Fallback'] = 'groq/qwen3.8-27b';
	} else {
		aiModel = getModel(c.env, modelConfig.provider, modelConfig.model) as unknown as LanguageModelV1;
	}

	const tools = {
		...createFinancialTools(c.env.REEDRICH_API_URL, user.accessToken, c.env.REEDRICH),
		...createMutationTools(c.env.REEDRICH_API_URL, user.accessToken, c.env.REEDRICH),
		...createWalletTools(c.env.REEDRICH_API_URL, user.accessToken, c.env.REEDRICH),
		...createBudgetTools(c.env.REEDRICH_API_URL, user.accessToken, c.env.REEDRICH),
		...createDebtLoanTools(c.env.REEDRICH_API_URL, user.accessToken, c.env.REEDRICH),
		...createGoalTools(c.env.REEDRICH_API_URL, user.accessToken, c.env.REEDRICH),
		...createRecurringTools(c.env.REEDRICH_API_URL, user.accessToken, c.env.REEDRICH),
		...createFeedbackTools(c.env.REEDRICH_API_URL, user.accessToken, c.env.REEDRICH),
		...createMemoryTools(c.env.DB, user.userId),
		...createStatementTools(c.env.CONFIG, user.userId),
	};

	const systemPrompt = buildSystemPrompt(body.pageContext, user.fullName, agentMemory, statementSummary);

	const providerOptions =
		modelConfig.capabilities.thinking && body.thinkingLevel && body.thinkingLevel !== 'off'
			? { openai: { reasoningEffort: body.thinkingLevel === 'minimal' ? 'low' : body.thinkingLevel } }
			: undefined;

	// Build user message content array with image part if present
	const userMessageContent: Array<
		{ type: 'text'; text: string } | { type: 'image'; image: string; mimeType: string }
	> = [{ type: 'text', text: body.message }];

	if (body.image) {
		userMessageContent.push({
			type: 'image',
			image: body.image.data,
			mimeType: body.image.mimeType
		});
	}

	const result = streamText({
		model: aiModel,
		system: systemPrompt,
		messages: [
			...priorMessages,
			{ role: 'user', content: userMessageContent }
		],
		tools,
		maxSteps: 10,
		...(providerOptions ? { providerOptions } : {}),
		onFinish: (ev) => {
			c.executionCtx.waitUntil(
				(async () => {
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
				})()
			);
		}
	});

	async function* transformDataStream(sourceStream: ReadableStream<string>) {
		const reader = sourceStream.getReader();
		const decoder = new TextDecoder();
		let buffer = '';
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += typeof value === 'string' ? value : decoder.decode(value, { stream: true });
			const lines = buffer.split('\n');
			buffer = lines.pop() ?? '';
			for (const line of lines) {
				if (line.startsWith('d:')) {
					try {
						const data = JSON.parse(line.slice(2));
						const promptTokens = data.usage?.promptTokens ?? estimateTokens(history);
						const completionTokens = data.usage?.completionTokens ?? 50;
						const creds = await settleCredits(promptTokens, completionTokens);
						yield 'd:' + JSON.stringify({ ...data, ...creds }) + '\n';
						continue;
					} catch (e) {
						console.error('Failed to augment d: metadata with credits:', e);
					}
				}
				yield line + '\n';
			}
		}
		if (buffer) yield buffer;
	}

	const transformedReadable = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();
			try {
				for await (const chunk of transformDataStream(result.toDataStream())) {
					controller.enqueue(encoder.encode(chunk));
				}
			} catch (err) {
				controller.enqueue(encoder.encode(`3:${JSON.stringify((err as Error)?.message || String(err))}\n`));
			} finally {
				controller.close();
			}
		}
	});

	return new Response(transformedReadable, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			...responseHeaders
		}
	});
});

export { chatRouter };
