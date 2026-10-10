import { GoogleGenAI, type FunctionDeclaration, Type } from '@google/genai';
import type { PageContext } from '@maniy/shared';
import { createFinancialTools } from '../src/agent/tools/financial.js';
import { createMutationTools } from '../src/agent/tools/mutations.js';
import { createWalletTools } from '../src/agent/tools/wallet-management.js';
import { createBudgetTools } from '../src/agent/tools/budget-management.js';
import { createDebtLoanTools } from '../src/agent/tools/debt-loan.js';
import { createGoalTools } from '../src/agent/tools/goal-management.js';
import { createRecurringTools } from '../src/agent/tools/recurring.js';
import { createFeedbackTools } from '../src/agent/tools/feedback.js';
import { createUICommandTools } from '../src/agent/tools/ui-commands.js';
import { buildGeminiDeclarations, type ToolDefinitionLike } from '../src/agent/gemini-declarations.js';
import { buildSystemPrompt } from '../src/agent/system-prompt.js';
import { EVAL_DATASET } from './dataset.js';

const REEDRICH_URL = process.env.REEDRICH_API_BASE || process.env.REEDRICH_URL || 'https://reedrich-mcp.lutfidmz.workers.dev';
const REEDRICH_TOKEN = process.env.REEDRICH_TEST_API_TOKEN || process.env.REEDRICH_TOKEN || '';
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

if (!REEDRICH_TOKEN) {
	console.warn('[WARN] REEDRICH_TEST_API_TOKEN is not set. Real finance API calls in eval will fail.');
}
if (!GEMINI_KEY) {
	console.warn('[WARN] GEMINI_API_KEY is not set. Gemini API initialization will fail if invoked.');
}

const ai = new GoogleGenAI({ apiKey: GEMINI_KEY || 'dummy_key_for_init' });

const tools: Record<string, ToolDefinitionLike> = {
	...createFinancialTools(REEDRICH_URL, REEDRICH_TOKEN),
	...createMutationTools(REEDRICH_URL, REEDRICH_TOKEN),
	...createWalletTools(REEDRICH_URL, REEDRICH_TOKEN),
	...createBudgetTools(REEDRICH_URL, REEDRICH_TOKEN),
	...createDebtLoanTools(REEDRICH_URL, REEDRICH_TOKEN),
	...createGoalTools(REEDRICH_URL, REEDRICH_TOKEN),
	...createRecurringTools(REEDRICH_URL, REEDRICH_TOKEN),
	...createFeedbackTools(REEDRICH_URL, REEDRICH_TOKEN),
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
	return { error: `Tool ${name} not found` };
}

console.log('\n======================================================');
console.log('🚀 EVALUATING AGENT REASONING: Gemini 3.1 Flash Lite');
console.log(`Registered Tools: ${toolDeclarations.length}`);
console.log('======================================================\n');

const results = [];

for (const tc of EVAL_DATASET) {
	console.log(`\n▶️ Running [${tc.id}] (${tc.category}): "${tc.prompt}"`);

	const pageContext: PageContext = tc.pageContext || {
		currentRoute: '/',
		activeTab: 'all',
		drawerOpen: false,
		selectedInstitution: null,
		summary: {
			totalNetWorth: 15099441.5,
			totalSpendable: 705000,
			totalLocked: 14394441.5,
			walletCount: 5,
			hasCashFlow: true
		}
	};

	const { promise, resolve } = Promise.withResolvers<void>();
	setTimeout(resolve, 2000);
	await promise;
	console.log(`\n▶️ Running [${tc.id}] (${tc.category}): "${tc.prompt}"`);

	const chat = ai.chats.create({
		model: 'gemini-3.1-flash-lite',
		config: {
			systemInstruction,
			tools: [{ functionDeclarations: toolDeclarations }]
		}
	});

	const toolCallsMade: string[] = [];
	let steps = 0;
	let content = '';
	const failures: string[] = [];

	try {
		let response = await chat.sendMessage({ message: tc.prompt });
		steps++;

		let loops = 8;
		while (loops-- > 0 && response.functionCalls && response.functionCalls.length > 0) {
			const parts = [];
			for (const fc of response.functionCalls) {
				const toolName = fc.name || '';
				toolCallsMade.push(toolName);
				const toolCallId = fc.id || `call_${crypto.randomUUID().slice(0, 8)}`;
				const toolResult = await executeTool(toolName, (fc.args || {}) as Record<string, unknown>, toolCallId);

				parts.push({
					functionResponse: {
						name: toolName,
						response: { output: toolResult }
					}
				});
			}

			response = await chat.sendMessage({ message: parts });
			steps++;
		}

		content = response.text || '';
	} catch (err: unknown) {
		failures.push(`Execution error: ${err instanceof Error ? err.message : String(err)}`);
	}

	// Validation
	const missingTools = tc.expected.requiredTools.filter((t) => !toolCallsMade.includes(t));
	if (missingTools.length > 0) {
		failures.push(`Missing required tools: ${missingTools.join(', ')}`);
	}

	if (tc.expected.minSteps && steps < tc.expected.minSteps) {
		failures.push(`Step count too low: expected >= ${tc.expected.minSteps}, got ${steps}`);
	}

	if (tc.expected.mustContain) {
		for (const mc of tc.expected.mustContain) {
			if (!content.toLowerCase().includes(mc.toLowerCase())) {
				failures.push(`Missing keyword: "${mc}"`);
			}
		}
	}

	if (tc.expected.mustNotContain) {
		for (const mnc of tc.expected.mustNotContain) {
			if (content.toLowerCase().includes(mnc.toLowerCase())) {
				failures.push(`Contained forbidden string: "${mnc}"`);
			}
		}
	}

	if (tc.expected.mathCheck && !tc.expected.mathCheck(content)) {
		failures.push('Failed math/numerical validation check.');
	}

	const passed = failures.length === 0;
	const score = passed ? 100 : Math.max(0, 100 - failures.length * 25);

	results.push({
		id: tc.id,
		passed,
		toolCalls: toolCallsMade,
		missingTools,
		content,
		steps,
		score,
		failures
	});

	if (passed) {
		console.log(`  ✅ PASSED (Score: ${score}/100, Steps: ${steps}, Tools: [${toolCallsMade.join(', ')}])`);
	} else {
		console.log(`  ❌ FAILED (Score: ${score}/100, Steps: ${steps}, Tools: [${toolCallsMade.join(', ')}])`);
		for (const f of failures) {
			console.log(`     - ${f}`);
		}
	}
}

const avgScore = Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length);
const passRate = Math.round((results.filter((r) => r.passed).length / results.length) * 100);

console.log('\n------------------------------------------------------');
console.log('📊 REASONING BENCHMARK REPORT: Gemini 3.1 Flash Lite');
console.log(`- Average Reasoning Score: ${avgScore} / 100`);
console.log(`- Test Pass Rate: ${passRate}% (${results.filter(r => r.passed).length}/${results.length})`);
console.log('------------------------------------------------------\n');
