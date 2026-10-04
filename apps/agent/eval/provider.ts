import { streamText, type LanguageModelV1 } from 'ai';
import { createFinancialTools } from '../src/agent/tools/financial.js';
import { createMutationTools } from '../src/agent/tools/mutations.js';
import { createWalletTools } from '../src/agent/tools/wallet-management.js';
import { createBudgetTools } from '../src/agent/tools/budget-management.js';
import { createDebtLoanTools } from '../src/agent/tools/debt-loan.js';
import { createGoalTools } from '../src/agent/tools/goal-management.js';
import { createRecurringTools } from '../src/agent/tools/recurring.js';
import { createFeedbackTools } from '../src/agent/tools/feedback.js';
import { createUICommandTools } from '../src/agent/tools/ui-commands.js';
import { buildSystemPrompt } from '../src/agent/system-prompt.js';
import { getModel } from '../src/agent/models.js';
import fs from 'node:fs';
import os from 'node:os';
import type { PageContext } from '@maniyy/shared';
import type { Env } from '../src/types.js';

interface ProviderContext {
	vars?: Record<string, unknown>;
	prompt?: { label?: string };
}

interface ProviderResponse {
	output: string;
	tokenUsage?: { total?: number; prompt?: number; completion?: number };
	metadata?: Record<string, unknown>;
}

export default class ManiyyAgentProvider {
	private providerId: string;
	public config: Record<string, unknown>;

	constructor(options: { id?: string; config?: Record<string, unknown> } = {}) {
		this.providerId = options.id || 'maniyy-agent-provider';
		this.config = options.config || {};
	}

	id(): string {
		return (this.config.model as string) || this.providerId;
	}

	async callApi(prompt: string, context?: ProviderContext): Promise<ProviderResponse> {
		const modelName =
			(this.config.model as string) || 'google-antigravity/gemini-3.7-flash';

		const reedrichUrl =
			process.env.REEDRICH_API_BASE ||
			process.env.REEDRICH_URL ||
			'https://reedrich-mcp.lutfidmz.workers.dev';
		let reedrichToken =
			process.env.REEDRICH_TEST_API_TOKEN || process.env.REEDRICH_TOKEN || '';
		if (!reedrichToken) {
			try {
				const stateFile = `${os.homedir()}/.omp/tmp/telegram/state.json`;
				if (fs.existsSync(stateFile)) {
					const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
					reedrichToken = state.apiKey || '';
				}
			} catch {}
		}
		let ompKey = process.env.OMP_GATEWAY_KEY || '';
		if (!ompKey) {
			try {
				ompKey = fs.readFileSync(`${os.homedir()}/.omp/auth-gateway.token`, 'utf-8').trim();
			} catch {}
		}

		const env: Env = {
			DB: {} as unknown as D1Database,
			CONFIG: {} as unknown as KVNamespace,
			REEDRICH_API_URL: reedrichUrl,
			GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
			GROQ_API_KEY: process.env.GROQ_API_KEY || '',
			OMP_GATEWAY_KEY: ompKey || 'public',
			OMP_GATEWAY_URL: process.env.OMP_GATEWAY_URL || 'https://ai.membran.app/v1'
		};

		const tools = {
			...createFinancialTools(reedrichUrl, reedrichToken),
			...createMutationTools(reedrichUrl, reedrichToken),
			...createWalletTools(reedrichUrl, reedrichToken),
			...createBudgetTools(reedrichUrl, reedrichToken),
			...createDebtLoanTools(reedrichUrl, reedrichToken),
			...createGoalTools(reedrichUrl, reedrichToken),
			...createRecurringTools(reedrichUrl, reedrichToken),
			...createFeedbackTools(reedrichUrl, reedrichToken),
			...createUICommandTools()
		};

		const pageContext = (context?.vars?.pageContext as unknown as PageContext) || {
			currentRoute: '/',
			activeTab: 'all',
			selectedInstitution: null,
			summary: {
				totalNetWorth: 15284837.21,
				totalSpendable: 723792.15,
				totalLocked: 14561045.06,
				walletCount: 17,
				hasCashFlow: true
			}
		};

		const systemPrompt = buildSystemPrompt(pageContext, 'Lutfi Zain');
		const aiModel = getModel(env, 'omp', modelName) as unknown as LanguageModelV1;

		try {
			const result = streamText({
				model: aiModel,
				system: systemPrompt,
				messages: [{ role: 'user', content: prompt }],
				tools,
				maxSteps: 10
			});

			for await (const _ of result.textStream) {}
			const steps = await result.steps;
			const finalText = steps.map((s) => s.text).filter(Boolean).join('\n');

			const calledTools: string[] = [];
			for (const step of steps) {
				if (step.toolCalls) {
					for (const tc of step.toolCalls) {
						calledTools.push(tc.toolName);
					}
				}
			}

			const toolSummary =
				calledTools.length > 0
					? `\n\n[Tools Called: ${calledTools.join(', ')}]`
					: '';

			return {
				output: `${finalText}${toolSummary}`,
				metadata: {
					calledTools,
					steps: steps.length,
					model: modelName
				}
			};
		} catch (err) {
			const errMsg = err instanceof Error ? err.message : String(err);
			return {
				output: `Error during agent execution: ${errMsg}`,
				metadata: { error: errMsg }
			};
		}
	}
}
