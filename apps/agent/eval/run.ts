import { streamText, isStepCount } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createFinancialTools } from '../src/agent/tools/financial.js';
import { createMutationTools } from '../src/agent/tools/mutations.js';
import { createUICommandTools } from '../src/agent/tools/ui-commands.js';
import { buildSystemPrompt } from '../src/agent/system-prompt.js';
import { EVAL_DATASET, type EvalTestCase } from './dataset.js';

interface EvalResult {
	id: string;
	passed: boolean;
	toolCalls: string[];
	missingTools: string[];
	content: string;
	steps: number;
	score: number; // 0 - 100
	failures: string[];
}

const REEDRICH_URL = process.env.REEDRICH_API_BASE || process.env.REEDRICH_URL || 'https://reedrich-mcp.lutfidmz.workers.dev';
const REEDRICH_TOKEN = process.env.REEDRICH_TEST_API_TOKEN || process.env.REEDRICH_TOKEN || '';

export async function runEval(providerType: 'gemini' | 'groq', modelName: string) {
	console.log(`\n======================================================`);
	console.log(`🚀 EVALUATING AGENT REASONING: ${providerType} (${modelName})`);
	console.log(`======================================================\n`);

	if (!REEDRICH_TOKEN) {
		throw new Error('Preflight Error: Missing REEDRICH_TEST_API_TOKEN (or REEDRICH_TOKEN) environment variable.');
	}

	const geminiKey = process.env.GEMINI_API_KEY || '';
	const groqKey = process.env.GROQ_API_KEY || '';

	if (providerType === 'gemini' && !geminiKey) {
		throw new Error('Preflight Error: Missing GEMINI_API_KEY environment variable.');
	}
	if (providerType === 'groq' && !groqKey) {
		throw new Error('Preflight Error: Missing GROQ_API_KEY environment variable.');
	}

	const model = providerType === 'gemini'
		? createGoogleGenerativeAI({ apiKey: geminiKey })(modelName)
		: createGroq({ apiKey: groqKey })(modelName);
	const tools = {
		...createFinancialTools(REEDRICH_URL, REEDRICH_TOKEN),
		...createMutationTools(REEDRICH_URL, REEDRICH_TOKEN),
		...createUICommandTools()
	};

	const results: EvalResult[] = [];

	for (const tc of EVAL_DATASET) {
		console.log(`▶ Running [${tc.id}] ${tc.category}: "${tc.prompt}"...`);

		const pageContext = tc.pageContext ?? {
			currentRoute: '/',
			activeTab: 'all',
			selectedInstitution: null,
			summary: { totalNetWorth: 15284837.21, totalSpendable: 723792.15, totalLocked: 14561045.06, walletCount: 17, hasCashFlow: true }
		};

		const systemPrompt = buildSystemPrompt(pageContext, 'Lutfi Zain');

		const calledTools: string[] = [];
		const failures: string[] = [];
		let finalContent = '';
		let stepCount = 0;

		try {
			const result = streamText({
				model,
				system: systemPrompt,
				messages: [{ role: 'user', content: tc.prompt }],
				tools,
				stopWhen: isStepCount(8)
			});

			const steps = await result.steps;
			stepCount = steps.length;

			for (const step of steps) {
				if (step.toolCalls) {
					for (const tc of step.toolCalls) {
						calledTools.push(tc.toolName);
					}
				}
				if (step.text) {
					finalContent += step.text;
				}
			}

			// Scoring criteria
			let toolScore = 100;
			const missingTools = tc.expected.requiredTools.filter((t) => !calledTools.includes(t));
			if (missingTools.length > 0) {
				toolScore = Math.max(0, 100 - (missingTools.length * 50));
				failures.push(`Missing tools: ${missingTools.join(', ')}`);
			}

			let contentScore = 100;
			if (tc.expected.mustContain) {
				for (const keyword of tc.expected.mustContain) {
					if (!finalContent.toLowerCase().includes(keyword.toLowerCase())) {
						contentScore -= Math.round(100 / tc.expected.mustContain.length);
						failures.push(`Content missing keyword: "${keyword}"`);
					}
				}
			}

			let mathScore = 100;
			if (tc.expected.mathCheck && !tc.expected.mathCheck(finalContent)) {
				mathScore = 0;
				failures.push(`Math verification failed`);
			}

			const totalScore = Math.max(0, Math.round((toolScore * 0.4) + (contentScore * 0.3) + (mathScore * 0.3)));
			const passed = totalScore >= 75;

			results.push({
				id: tc.id,
				passed,
				toolCalls: calledTools,
				missingTools,
				content: finalContent.slice(0, 200),
				steps: stepCount,
				score: totalScore,
				failures
			});

			console.log(`   ${passed ? '✅ PASSED' : '❌ FAILED'} | Score: ${totalScore}/100 | Steps: ${stepCount} | Tools: [${calledTools.join(', ')}]`);
			if (failures.length > 0) {
				console.log(`   Notes: ${failures.join('; ')}`);
			}
		} catch (err) {
			console.log(`   ❌ ERROR: ${(err as Error).message}`);
			results.push({
				id: tc.id,
				passed: false,
				toolCalls: [],
				missingTools: tc.expected.requiredTools,
				content: '',
				steps: 0,
				score: 0,
				failures: [(err as Error).message]
			});
		}
	}

	const avgScore = Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length);
	const passRate = Math.round((results.filter((r) => r.passed).length / results.length) * 100);

	console.log(`\n------------------------------------------------------`);
	console.log(`📊 REASONING BENCHMARK REPORT: ${modelName}`);
	console.log(`- Average Reasoning Score: ${avgScore} / 100`);
	console.log(`- Test Pass Rate: ${passRate}% (${results.filter(r => r.passed).length}/${results.length})`);
	console.log(`------------------------------------------------------\n`);

	return { avgScore, passRate, results };
}

// Run for Gemini 3.8 Flash
await runEval('gemini', 'gemini-3.8-flash');
