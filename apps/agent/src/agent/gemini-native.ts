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
import { createUICommandTools } from './tools/ui-commands.js';
import { buildGeminiDeclarations, type ToolDefinitionLike } from './gemini-declarations.js';
import { buildSystemPrompt } from './system-prompt.js';

export function createGeminiRunner(
	apiKey: string,
	reedrichUrl: string,
	token: string,
	fetcher?: Fetcher,
	db?: D1Database,
	userId?: string,
	agentMemory?: AgentMemory
) {
	const ai = new GoogleGenAI({ apiKey });

	const tools: Record<string, ToolDefinitionLike> = {
		...createFinancialTools(reedrichUrl, token, fetcher),
		...createMutationTools(reedrichUrl, token, fetcher),
		...createWalletTools(reedrichUrl, token, fetcher),
		...createBudgetTools(reedrichUrl, token, fetcher),
		...createDebtLoanTools(reedrichUrl, token, fetcher),
		...createGoalTools(reedrichUrl, token, fetcher),
		...createRecurringTools(reedrichUrl, token, fetcher),
		...createFeedbackTools(reedrichUrl, token, fetcher),
		...(db && userId ? createMemoryTools(db, userId) : {}),
		...createUICommandTools()
	};

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
		thinkingLevel?: ThinkingLevel
	): AsyncGenerator<string> {
		yield `f:{"messageId":"msg-${crypto.randomUUID()}"}\n`;

		const systemInstruction = buildSystemPrompt(pageContext, userName, agentMemory);

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

		const chat = ai.chats.create({
			model: modelName,
			history,
			config: {
				systemInstruction,
				tools: [{ functionDeclarations: toolDeclarations }],
				...(thinkingConfig ? { thinkingConfig } : {})
			}
		});

		let response;
		try {
			response = await chat.sendMessage({ message: userMessage });
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

			let nextFunctionCalls: typeof response.functionCalls | undefined;

			for await (const chunk of stream) {
				if (chunk.text) {
					yield `0:${JSON.stringify(chunk.text)}\n`;
				}
				if (chunk.functionCalls && chunk.functionCalls.length > 0) {
					nextFunctionCalls = chunk.functionCalls;
					response = chunk;
				}
			}

			if (!nextFunctionCalls || nextFunctionCalls.length === 0) {
				yield `e:{"finishReason":"stop","usage":{"promptTokens":100,"completionTokens":100},"isContinued":false}\n`;
				yield `d:{"finishReason":"stop","usage":{"promptTokens":100,"completionTokens":100}}\n`;
				return;
			}
		}

		if (response.text) {
			yield `0:${JSON.stringify(response.text)}\n`;
		}

		yield `e:{"finishReason":"stop","usage":{"promptTokens":100,"completionTokens":100},"isContinued":false}\n`;
		yield `d:{"finishReason":"stop","usage":{"promptTokens":100,"completionTokens":100}}\n`;
	}

	return { runGeminiStream, tools, toolDeclarations };
}
