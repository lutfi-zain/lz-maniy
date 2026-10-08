/// <reference types="@cloudflare/workers-types" />
import { GoogleGenAI, ThinkingLevel as GeminiThinkingLevel } from '@google/genai';
import type { PageContext, ThinkingLevel, AgentMemory } from '@maniyy/shared';
import { createFinancialTools } from './tools/financial.js';
import { createMutationTools } from './tools/mutations.js';
import { createWalletTools } from './tools/wallet-management.js';
import { createBudgetTools } from './tools/budget-management.js';
import { createDebtLoanTools } from './tools/debt-loan.js';
import { createGoalTools } from './tools/goal-management.js';
import { createRecurringTools } from './tools/recurring.js';
import { createFeedbackTools } from './tools/feedback.js';
import { createMemoryTools } from './tools/memory.js';
import { createStatementTools } from './tools/statements.js';
import { buildGeminiDeclarations, type ToolDefinitionLike } from './gemini-declarations.js';
import { buildSystemPrompt } from './system-prompt.js';
import { createUICommandTools } from './tools/ui-commands.js';
import { wrapToolsWithTracing } from '../observability/instrument-tools.js';
import type { WorkerTracer } from '../observability/tracer.js';

export function createGeminiRunner(
	apiKey: string,
	reedrichUrl: string,
	token: string,
	fetcher?: Fetcher,
	db?: D1Database,
	userId?: string,
	agentMemory?: AgentMemory,
	onSettleCredits?: (promptTokens: number, completionTokens: number) => Promise<{ creditsUsed: number; creditsRemaining: number }>,
	kv?: KVNamespace,
	tracer?: WorkerTracer
) {
	const ai = new GoogleGenAI({ apiKey });

	const rawTools: Record<string, ToolDefinitionLike> = {
		...createFinancialTools(reedrichUrl, token, fetcher),
		...createMutationTools(reedrichUrl, token, fetcher),
		...createWalletTools(reedrichUrl, token, fetcher),
		...createBudgetTools(reedrichUrl, token, fetcher),
		...createDebtLoanTools(reedrichUrl, token, fetcher),
		...createGoalTools(reedrichUrl, token, fetcher),
		...createRecurringTools(reedrichUrl, token, fetcher),
		...createFeedbackTools(reedrichUrl, token, fetcher),
		...(db && userId ? createMemoryTools(db, userId) : {}),
		...(kv && userId ? createStatementTools(kv, userId) : {}),
		...createUICommandTools()
	};
	const tools = wrapToolsWithTracing(rawTools, tracer, { includeSubSpans: true });
	const toolDeclarations = buildGeminiDeclarations(tools);

	async function executeTool(name: string, args: Record<string, unknown>, toolCallId: string): Promise<unknown> {
		const toolDef = tools[name];
		if (toolDef && typeof toolDef.execute === 'function') {
			try {
				return await toolDef.execute(args, { toolCallId, messages: [] });
			} catch (err: unknown) {
				const errorMsg = err instanceof Error ? err.message : String(err);
				return { error: `Tool ${name} failed: ${errorMsg}` };
			}
		}
		return { error: `Tool ${name} not found or has no execute method` };
	}

	async function* runGeminiStream(
		modelName: string,
		userMessage: string,
		pageContext: PageContext,
		userName: string,
		priorMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [],
		thinkingLevel?: ThinkingLevel,
		image?: { data: string; mimeType: string },
		statementSummary?: string | null
	): AsyncGenerator<string> {
		yield `f:{"messageId":"msg-${crypto.randomUUID()}"}\n`;

		const systemInstruction = buildSystemPrompt(pageContext, userName, agentMemory, statementSummary);

		const thinkingConfig = (() => {
			if (!thinkingLevel || thinkingLevel === 'off') {
				return { thinkingBudget: 0 };
			}
			switch (thinkingLevel) {
				case 'minimal':
					return { thinkingLevel: GeminiThinkingLevel.MINIMAL };
				case 'low':
					return { thinkingLevel: GeminiThinkingLevel.LOW };
				case 'medium':
					return { thinkingLevel: GeminiThinkingLevel.MEDIUM };
				case 'high':
				case 'xhigh':
					return { thinkingLevel: GeminiThinkingLevel.HIGH };
				default:
					return undefined;
			}
		})();

		const history = priorMessages
			.filter((m) => m.content?.trim())
			.map((m) => ({
				role: m.role === 'user' ? 'user' : 'model',
				parts: [{ text: m.content }]
			}));

		let totalPromptTokens = 0;
		let totalCompletionTokens = 0;

		const chat = ai.chats.create({
			model: modelName,
			history,
			config: {
				systemInstruction,
				tools: [{ functionDeclarations: toolDeclarations }],
				...(thinkingConfig ? { thinkingConfig } : {})
			}
		});

		const messageParts = image
			? [
					{ text: userMessage },
					{ inlineData: { data: image.data, mimeType: image.mimeType } }
				]
			: userMessage;

		let response;
		try {
			const messageArg = messageParts as unknown as string;
			response = await chat.sendMessage({ message: messageArg });
		if (response && typeof response === 'object' && 'usageMetadata' in response && response.usageMetadata) {
			const meta = response.usageMetadata as { promptTokenCount?: number; candidatesTokenCount?: number };
			totalPromptTokens += meta.promptTokenCount ?? 0;
			totalCompletionTokens += meta.candidatesTokenCount ?? 0;
		}
		} catch (err: unknown) {
			const errMsg = (err as Error)?.message || String(err);
			if (errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE')) {
				yield `0:${JSON.stringify('⚠️ Model ' + modelName + ' saat ini sedang mengalami lonjakan beban tinggi sementara di Google. Silakan coba sesaat lagi atau gunakan model Gemini 3.1 Flash Lite.')}\n`;
				yield `e:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0},"isContinued":false}\n`;
				yield `d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`;
				return;
			}
			throw err;
		}

		let loops = 8;
		while (loops-- > 0 && response.functionCalls && response.functionCalls.length > 0) {
			const fCalls = response.functionCalls;
			const parts = [];

			for (const fc of fCalls) {
				const toolName = fc.name || '';
				const toolCallId = fc.id || `call_${crypto.randomUUID().slice(0, 8)}`;
				yield `9:${JSON.stringify({ toolCallId, toolName, args: fc.args || {} })}\n`;

				const toolResult = await executeTool(toolName, (fc.args || {}) as Record<string, unknown>, toolCallId);

				yield `a:${JSON.stringify({ toolCallId, toolName, result: toolResult })}\n`;

				parts.push({
					functionResponse: {
						name: toolName,
						response: { output: toolResult }
					}
				});
			}

			let stream;
			try {
				stream = await chat.sendMessageStream({ message: parts });
			} catch (err: unknown) {
				const errMsg = (err as Error)?.message || String(err);
				if (errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE')) {
					yield `0:${JSON.stringify('⚠️ Model ' + modelName + ' mengalami lonjakan beban tinggi di Google saat memproses hasil. Silakan ulangi dengan tombol Coba Lagi atau gunakan Gemini 3.1 Flash Lite.')}\n`;
					yield `e:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0},"isContinued":false}\n`;
					yield `d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`;
					return;
				}
				throw err;
			}

			let streamPromptTokens = 0;
			let streamCompletionTokens = 0;
			let nextFunctionCalls: typeof response.functionCalls | undefined;

			for await (const chunk of stream) {
				let streamedPart = false;
				if (chunk && typeof chunk === 'object' && 'candidates' in chunk && Array.isArray(chunk.candidates)) {
					const firstCand = chunk.candidates[0];
					if (firstCand && typeof firstCand === 'object' && 'content' in firstCand && firstCand.content) {
						const contentObj = firstCand.content;
						if (typeof contentObj === 'object' && 'parts' in contentObj && Array.isArray(contentObj.parts)) {
							for (const part of contentObj.parts) {
								if (part && typeof part === 'object') {
									const isThought = 'thought' in part && Boolean(part.thought);
									const textVal = 'text' in part && typeof part.text === 'string' ? part.text : '';
									if (isThought && textVal) {
										yield `g:${JSON.stringify(textVal)}\n`;
										streamedPart = true;
									} else if (!isThought && textVal) {
										yield `0:${JSON.stringify(textVal)}\n`;
										streamedPart = true;
									}
								}
							}
						}
					}
				}
				if (chunk && typeof chunk === 'object' && 'usageMetadata' in chunk && chunk.usageMetadata) {
					const meta = chunk.usageMetadata as { promptTokenCount?: number; candidatesTokenCount?: number };
					if (meta.promptTokenCount) streamPromptTokens = meta.promptTokenCount;
					if (meta.candidatesTokenCount) streamCompletionTokens = meta.candidatesTokenCount;
				}
				if (!streamedPart && chunk.text) {
					yield `0:${JSON.stringify(chunk.text)}\n`;
				}
				if (chunk.functionCalls && chunk.functionCalls.length > 0) {
					nextFunctionCalls = chunk.functionCalls;
					response = chunk;
				}
			}
			totalPromptTokens += streamPromptTokens;
			totalCompletionTokens += streamCompletionTokens;
			if (!nextFunctionCalls || nextFunctionCalls.length === 0) {
				if (totalPromptTokens === 0) totalPromptTokens = 150;
				if (totalCompletionTokens === 0) totalCompletionTokens = 80;
				let creditData: { creditsUsed?: number; creditsRemaining?: number } = {};
				if (onSettleCredits) {
					try {
						creditData = await onSettleCredits(totalPromptTokens, totalCompletionTokens);
					} catch (err) {
						console.error('Failed to settle credits in Gemini stream:', err);
					}
				}
				yield `e:${JSON.stringify({ finishReason: 'stop', usage: { promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens }, isContinued: false })}\n`;
				yield `d:${JSON.stringify({ finishReason: 'stop', usage: { promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens }, ...creditData })}\n`;
				return;
			}
		}

		if (response.text) {
			yield `0:${JSON.stringify(response.text)}\n`;
		}
		if (totalPromptTokens === 0) totalPromptTokens = 150;
		if (totalCompletionTokens === 0) totalCompletionTokens = 80;
		let creditData: { creditsUsed?: number; creditsRemaining?: number } = {};
		if (onSettleCredits) {
			try {
				creditData = await onSettleCredits(totalPromptTokens, totalCompletionTokens);
			} catch (err) {
				console.error('Failed to settle credits in Gemini stream:', err);
			}
		}
		yield `e:${JSON.stringify({ finishReason: 'stop', usage: { promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens }, isContinued: false })}\n`;
		yield `d:${JSON.stringify({ finishReason: 'stop', usage: { promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens }, ...creditData })}\n`;
	}
	return { runGeminiStream, tools, toolDeclarations };
}
