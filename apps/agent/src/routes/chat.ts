import { wrapToolsWithTracing } from '../observability/instrument-tools.js';
import {
	buildOpenInferenceLlmAttributes,
	buildOpenInferenceRetrieverAttributes
} from '../observability/tracer.js';
import { Hono } from 'hono';
import { streamText, generateText, type LanguageModelV1 } from 'ai';
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
import { evaluateTurn } from '../observability/evaluators.js';
import { sendTelegramAlert } from '../observability/alerts.js';
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
import type { ChatStreamRequest } from '@maniy/shared';

export async function attemptFallbackSynthesis(
	aiModel: LanguageModelV1,
	userPrompt: string,
	toolData: unknown[]
): Promise<string | null> {
	if (!toolData || toolData.length === 0) return null;
	try {
		const res = await generateText({
			model: aiModel,
			system:
				'Anda adalah Eve, asisten keuangan pribadi cerdas di Maniy. Jawab pertanyaan user secara akurat, ringkas, dan solutif berdasarkan data keuangan yang telah berhasil diambil berikut. Dilarang menggunakan simbol dollar ($), gunakan format Rupiah Rp X.XXX.XXX.',
			prompt: `Pertanyaan User: ${userPrompt}\n\nData Keuangan dari Sistem:\n${JSON.stringify(toolData).slice(0, 10000)}`
		});
		return res.text?.trim() || null;
	} catch (err) {
		console.warn('[Recovery] Fallback synthesis failed:', err);
		return null;
	}
}

const chatRouter = new Hono<{ Bindings: Env }>();

chatRouter.use('*', authMiddleware);

chatRouter.post('/', async (c) => {
	const user = c.get('user');
	const tracer = c.get('tracer');
	const body = await c.req.json<ChatStreamRequest>();
	const reqStart = Date.now();
	let capturedToolResults: unknown[] = [];

	if (!body.message?.trim() && !body.image) {
		return c.json({ error: 'bad_request', message: 'Message is required' }, 400);
	}
	tracer?.rootSpan?.setAttribute('input.value', body.message);
	tracer?.rootSpan?.setAttribute('user.id', user.userId);

	// 1. Credit Pre-check
	const creditSpan = tracer?.startSpan('creditPreCheck', {
		attributes: {
			'openinference.span.kind': 'GUARDRAIL',
			'user.id': user.userId,
			'input.value': `Check credit balance for ${user.userId}`
		}
	});
	const creditState = await getOrCreateUserCredits(c.env.DB, user.userId);
	creditSpan?.setAttribute('credit.balance', creditState.balance);
	creditSpan?.setAttribute('output.value', `Balance: ${creditState.balance}`);
	if (creditState.balance <= 0) {
		creditSpan?.setStatus({ code: 2, message: 'insufficient_credits' });
		creditSpan?.end();
		return c.json(
			{
				error: 'insufficient_credits',
				message: 'Kredit habis. Hubungi admin untuk top-up.',
				balance: creditState.balance
			},
			402
		);
	}
	creditSpan?.setStatus({ code: 1 });
	creditSpan?.end();
	// 2. Resolve model (with legacy/unrouted fallback and default gemini-3.8-flash)
	const DEFAULT_MODEL_ID = 'google-antigravity/gemini-3.8-flash';
	let requestedProvider = body.model?.provider ?? 'omp';
	let requestedModel = body.model?.model ?? DEFAULT_MODEL_ID;

	// Silent fallback for legacy opencode provider or unrouted model IDs
	if ((requestedProvider as string) === 'opencode' || requestedModel.includes('3.7-flash')) {
		requestedProvider = 'omp';
		requestedModel = DEFAULT_MODEL_ID;
	}

	let modelConfig =
		AVAILABLE_MODELS.find(
			(m) => m.provider === requestedProvider && m.model === requestedModel
		) ??
		AVAILABLE_MODELS.find((m) => m.model === DEFAULT_MODEL_ID) ??
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
	tracer?.rootSpan?.setAttribute('session.id', activeConvId);
	tracer?.rootSpan?.setAttribute('conversation.id', activeConvId);

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

	// Retrieve agent memory & context with tracing
	const contextSpan = tracer?.startSpan('contextRetrieval', {
		attributes: {
			...buildOpenInferenceRetrieverAttributes({
				query: body.message,
				documents: [
					{
						id: `conv-${activeConvId}`,
						content: `Conversation history (${priorMessages.length} prior turns) for user ${user.userId}`,
						score: 0.95,
						metadata: { conversationId: activeConvId, priorTurns: priorMessages.length }
					}
				]
			}),
			'conversation.id': activeConvId,
			'user.id': user.userId,
			'has_statement_session': !!body.statementSessionId
		}
	});
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
	contextSpan?.setStatus({ code: 1 });
	contextSpan?.end();

	// Helper for credit settlement on stream completion
	const settleCredits = async (promptTokens: number, completionTokens: number) => {
		const settleSpan = tracer?.startSpan('creditSettlement', {
			attributes: {
				'openinference.span.kind': 'CHAIN',
				'model': modelConfig.model,
				'prompt_tokens': promptTokens,
				'completion_tokens': completionTokens,
				'input.value': `Settle ${promptTokens} prompt + ${completionTokens} completion tokens`
			}
		});
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
		settleSpan?.setAttribute('credits_used', creditsUsed);
		settleSpan?.setAttribute('credits_remaining', remaining);
		settleSpan?.setAttribute('output.value', `Used ${creditsUsed} credits, remaining ${remaining}`);
		settleSpan?.setStatus({ code: 1 });
		settleSpan?.end();
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
			c.env.CONFIG,
			tracer
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
		const geminiSpan = tracer?.startSpan('ai.geminiStream', {
			attributes: {
				...buildOpenInferenceLlmAttributes({
					modelName: modelConfig.model,
					provider: 'google',
					invocationParameters: { thinking_level: body.thinkingLevel || 'off' },
					inputMessages: [{ role: 'user', content: body.message }]
				}),
				'input.value': body.message
			}
		});
		if (geminiSpan) {
			tracer?.setActiveParentSpan(geminiSpan.spanId);
		}
		tracer?.deferFlush();

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
					geminiSpan?.recordException(err);
					controller.enqueue(encoder.encode(`3:${JSON.stringify((err as Error).message)}\n`));
				} finally {
					controller.close();
					c.executionCtx.waitUntil(
						(async () => {
							if (fullAssistantText) {
								geminiSpan?.setAttribute('output.value', fullAssistantText);
								geminiSpan?.setAttribute('llm.output_messages.0.message.content', fullAssistantText);
								tracer?.rootSpan?.setAttribute('output.value', fullAssistantText);
								const msgSpan = tracer?.startSpan('db.insertMessage', {
									attributes: {
										'openinference.span.kind': 'CHAIN',
										'conversation.id': activeConvId,
										'message.role': 'assistant',
										'output.value': fullAssistantText.slice(0, 500)
									}
								});
								await insertMessage(c.env.DB, {
									id: crypto.randomUUID(),
									conversationId: activeConvId,
									role: 'assistant',
									content: fullAssistantText
								});
								await touchConversation(c.env.DB, activeConvId);
								msgSpan?.setStatus({ code: 1 }).end();
							}
							geminiSpan?.setStatus({ code: 1 }).end();
							tracer?.rootSpan?.end();
							await tracer?.flush();
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

	const rawTools = {
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
	const tools = wrapToolsWithTracing(rawTools, tracer, { includeSubSpans: true });

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

	const inferenceSpan = tracer?.startSpan('ai.streamText', {
		attributes: {
			...buildOpenInferenceLlmAttributes({
				modelName: modelConfig.model,
				provider: modelConfig.provider,
				invocationParameters: {
					max_steps: 10,
					thinking_level: body.thinkingLevel || 'off'
				},
				inputMessages: [
					{ role: 'system', content: systemPrompt.slice(0, 1200) },
					...priorMessages.slice(-4).map((m) => ({ role: m.role, content: m.content })),
					{ role: 'user', content: body.message }
				]
			}),
			'ai.model': modelConfig.model,
			'ai.provider': modelConfig.provider,
			'ai.max_steps': 10,
			'ai.thinking_level': body.thinkingLevel || 'off',
			'input.value': body.message
		}
	});
	if (inferenceSpan) {
		tracer?.setActiveParentSpan(inferenceSpan.spanId);
	}
	let streamedText = '';
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
			const promptTok = ev.usage?.promptTokens || estimateTokens(history);
			const compTok = ev.usage?.completionTokens || Math.max(25, Math.ceil((ev.text || streamedText).length / 4));
			inferenceSpan?.setAttribute('ai.usage.prompt_tokens', promptTok);
			inferenceSpan?.setAttribute('ai.usage.completion_tokens', compTok);
			inferenceSpan?.setAttribute('llm.token_count.prompt', promptTok);
			inferenceSpan?.setAttribute('llm.token_count.completion', compTok);
			inferenceSpan?.setAttribute('llm.token_count.total', promptTok + compTok);
			const outText = ev.text || streamedText;
			if (outText) {
				inferenceSpan?.setAttribute('output.value', outText);
				inferenceSpan?.setAttribute('llm.output_messages.0.message.content', outText);
				tracer?.rootSpan?.setAttribute('output.value', outText);
			}
			// Populate tool calls on output messages so Langfuse / Phoenix show called tools
			const allToolCalls = (ev.steps && ev.steps.length > 0)
				? ev.steps.flatMap((s) => s.toolCalls || [])
				: (ev.toolCalls || []);
			if (ev.steps && ev.steps.length > 0) {
				capturedToolResults = ev.steps.flatMap((s) => s.toolResults || []);
			}

			if (allToolCalls.length > 0) {
				allToolCalls.forEach((tc, idx) => {
					const name =
						'toolName' in tc && typeof tc.toolName === 'string'
							? tc.toolName
							: 'name' in tc && typeof tc.name === 'string'
							? tc.name
							: `tool_${idx}`;
					const args = 'args' in tc ? tc.args : {};
					const argsStr = typeof args === 'string' ? args : JSON.stringify(args ?? {});
					inferenceSpan?.setAttribute(
						`llm.output_messages.0.message.tool_calls.${idx}.tool_call.function.name`,
						name
					);
					inferenceSpan?.setAttribute(
						`llm.output_messages.0.message.tool_calls.${idx}.tool_call.function.arguments`,
						argsStr
					);
				});
			}
			inferenceSpan?.setAttribute('ai.finish_reason', ev.finishReason || 'stop');
			inferenceSpan?.setStatus({ code: 1 });
			inferenceSpan?.end();
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
				if (line.startsWith('0:')) {
					try {
						const textDelta = JSON.parse(line.slice(2).trim());
						if (typeof textDelta === 'string') {
							streamedText += textDelta;
						}
					} catch {
						/* ignore */
					}
				}
				if (line.startsWith('d:')) {
					try {
						const data = JSON.parse(line.slice(2));
						const promptTokens = data.usage?.promptTokens || estimateTokens(history);
						const completionTokens =
							data.usage?.completionTokens || Math.max(25, Math.ceil(streamedText.length / 4));
						const creds = await settleCredits(promptTokens, completionTokens);
						yield 'd:' + JSON.stringify({ ...data, ...creds }) + '\n';
						continue;
					} catch (e) {
						console.error('Failed to augment d: metadata with credits:', e);
					}
				}
				if (line.startsWith('3:')) {
					try {
						const errVal = JSON.parse(line.slice(2).trim());
						const rawMsg = typeof errVal === 'string' ? errVal : JSON.stringify(errVal);
						if (rawMsg.includes('MALFORMED_FUNCTION_CALL') && capturedToolResults.length > 0) {
							const recovered = await attemptFallbackSynthesis(aiModel, body.message, capturedToolResults);
							if (recovered) {
								streamedText += recovered;
								yield `0:${JSON.stringify(recovered)}\n`;
								continue;
							}
						}
						const cleanMsg = rawMsg.includes('Unknown model')
							? 'Model yang dipilih tidak tersedia di gateway upstream. Silakan ganti model atau muat ulang.'
							: rawMsg.includes('MALFORMED_FUNCTION_CALL')
							? 'Model mengalami kendala pemrosesan konteks fungsi. Silakan klik Coba Lagi untuk mengulang jawaban.'
							: rawMsg;
						yield `3:${JSON.stringify(cleanMsg)}\n`;
						continue;
					} catch {
						/* ignore */
					}
				}
				yield line + '\n';
			}
		}
		if (buffer) yield buffer;
	}

	tracer?.deferFlush();
	const transformedReadable = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();
			try {
				for await (const chunk of transformDataStream(
					result.toDataStream({
						getErrorMessage: (err) => {
							const msg = (err as Error)?.message || String(err);
							return msg.includes('Unknown model')
								? 'Model yang dipilih tidak tersedia di gateway upstream. Silakan ganti model atau muat ulang.'
								: msg;
						}
					})
				)) {
					controller.enqueue(encoder.encode(chunk));
				}
			} catch (err) {
				inferenceSpan?.recordException(err);
				const rawMsg = (err as Error)?.message || String(err);
				if (rawMsg.includes('MALFORMED_FUNCTION_CALL') && capturedToolResults.length > 0) {
					const recovered = await attemptFallbackSynthesis(aiModel, body.message, capturedToolResults);
					if (recovered) {
						streamedText += recovered;
						controller.enqueue(encoder.encode(`0:${JSON.stringify(recovered)}\n`));
						return;
					}
				}
				const cleanMsg = rawMsg.includes('Unknown model')
					? 'Model yang dipilih tidak tersedia di gateway upstream. Silakan ganti model atau muat ulang.'
					: rawMsg.includes('MALFORMED_FUNCTION_CALL')
					? 'Model mengalami kendala pemrosesan konteks fungsi. Silakan klik Coba Lagi untuk mengulang jawaban.'
					: rawMsg;
				controller.enqueue(encoder.encode(`3:${JSON.stringify(cleanMsg)}\n`));
			} finally {
				controller.close();
				c.executionCtx.waitUntil(
					(async () => {
						try {
							if (streamedText) {
								inferenceSpan?.setAttribute('output.value', streamedText);
								inferenceSpan?.setAttribute('llm.output_messages.0.message.content', streamedText);
								tracer?.rootSpan?.setAttribute('output.value', streamedText);
								const msgSpan = tracer?.startSpan('db.insertMessage', {
									parentSpanId: tracer?.rootSpan?.spanId,
									attributes: {
										'openinference.span.kind': 'CHAIN',
										'conversation.id': activeConvId,
										'message.role': 'assistant',
										'input.value': `Insert assistant message into conversation ${activeConvId}`,
										'output.value': streamedText.slice(0, 500)
									}
								});
								await insertMessage(c.env.DB, {
									id: crypto.randomUUID(),
									conversationId: activeConvId,
									role: 'assistant',
									content: streamedText
								});
								await touchConversation(c.env.DB, activeConvId);
								msgSpan?.setStatus({ code: 1 }).end();
								// 1. Latency check (>25s SLA breach)
								const turnDurationMs = Date.now() - reqStart;
								if (turnDurationMs > 25000) {
									await sendTelegramAlert(c.env, {
										title: 'P99 Latency SLA Breach (>25s)',
										sessionId: activeConvId,
										userId: user.userId,
										userMessage: body.message,
										assistantOutput: streamedText,
										latencyMs: turnDurationMs,
										phoenixTraceId: tracer?.rootSpan?.traceId
									});
								}

								// 2. Continuous evaluation (Adaptive sampling: 100% on issue/error, 15% on normal turns)
								const isSampled = Math.random() < 0.15;
								const hasIssue = !streamedText || streamedText.includes('⚠️') || streamedText.includes('Kendala');
								if ((hasIssue || isSampled) && streamedText) {
									try {
										const { results, hasAnomaly } = evaluateTurn(
											body.message,
											streamedText,
											capturedToolResults
										);

										for (const r of results) {
											tracer?.rootSpan?.setAttribute(`eval.${r.name}.score`, r.score);
											tracer?.rootSpan?.setAttribute(`eval.${r.name}.label`, r.label);
											if (r.explanation) {
												tracer?.rootSpan?.setAttribute(`eval.${r.name}.explanation`, r.explanation);
											}
										}

										if (hasAnomaly) {
											const failedEval = results.find((r) => r.score < 0.5);
											await sendTelegramAlert(c.env, {
												title: `Automated Eval Alert: ${failedEval?.name || 'Anomaly Detected'}`,
												sessionId: activeConvId,
												userId: user.userId,
												userMessage: body.message,
												assistantOutput: streamedText,
												score: failedEval?.score ?? 0,
												reason: failedEval?.explanation || failedEval?.label,
												phoenixTraceId: tracer?.rootSpan?.traceId,
												latencyMs: turnDurationMs
											});
										}
									} catch (evalErr) {
										console.warn('[Eval] Post-production evaluation error:', evalErr);
									}
								}
							}
						} finally {
							inferenceSpan?.setStatus({ code: 1 }).end();
							tracer?.rootSpan?.end();
							await tracer?.flush();
						}
					})()
				);
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
