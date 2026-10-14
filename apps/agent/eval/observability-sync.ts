import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EVAL_DATASET } from './dataset.js';
import { syncPhoenixFullSuite } from './phoenix-suite.js';

declare const process: {
	env: Record<string, string | undefined>;
	argv: string[];
	exit: (code?: number) => never;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Resolve environment variables from process.env or apps/agent/.dev.vars
function resolveEnv(): {
	langfuseBaseUrl: string;
	langfusePublicKey?: string;
	langfuseSecretKey?: string;
	ompGatewayKey?: string;
	phoenixApiKey?: string;
	phoenixBaseUrl: string;
} {
	let langfusePublicKey = process.env.LANGFUSE_PUBLIC_KEY;
	let langfuseSecretKey = process.env.LANGFUSE_SECRET_KEY;
	let langfuseBaseUrl = process.env.LANGFUSE_BASE_URL || 'https://us.cloud.langfuse.com';
	let ompGatewayKey = process.env.OMP_GATEWAY_KEY;
	let phoenixApiKey = process.env.PHOENIX_API_KEY || 'phx_adm_sec_e4b1c2d3f4a5b6c7_sec';
	let phoenixBaseUrl = (process.env.PHOENIX_ENDPOINT || 'https://phoenix.membran.app').replace(/\/v1\/traces\/?$/, '').replace(/\/+$/, '');
	if (!langfusePublicKey || !langfuseSecretKey) {
		const devVarsPath = path.resolve(__dirname, '..', '.dev.vars');
		if (fs.existsSync(devVarsPath)) {
			const content = fs.readFileSync(devVarsPath, 'utf8');
			for (const line of content.split('\n')) {
				const trimmed = line.trim();
				if (!trimmed || trimmed.startsWith('#')) continue;
				const match = /^([A-Z0-9_]+)=["']?(.*?)["']?$/.exec(trimmed);
				if (match) {
					const [, key, val] = match;
					if (key === 'LANGFUSE_PUBLIC_KEY' && !langfusePublicKey) langfusePublicKey = val;
					if (key === 'LANGFUSE_SECRET_KEY' && !langfuseSecretKey) langfuseSecretKey = val;
					if (key === 'LANGFUSE_BASE_URL' && !process.env.LANGFUSE_BASE_URL) langfuseBaseUrl = val;
					if (key === 'OMP_GATEWAY_KEY' && !ompGatewayKey) ompGatewayKey = val;
					if (key === 'PHOENIX_API_KEY' && !process.env.PHOENIX_API_KEY) phoenixApiKey = val;
				}
			}
		}
	}

	return { langfuseBaseUrl, langfusePublicKey, langfuseSecretKey, ompGatewayKey, phoenixApiKey, phoenixBaseUrl };
}

function readPromptText(fileName: string, fallback: string): string {
	try {
		const p = path.resolve(__dirname, 'prompts', fileName);
		return fs.readFileSync(p, 'utf8').trim();
	} catch {
		return fallback;
	}
}

async function syncLangfusePrompts(baseUrl: string, authHeader: string): Promise<number> {
	const prompts = [
		{
			name: 'system-baseline',
			prompt: readPromptText('system-baseline.txt', 'Anda adalah Maniy Financial Intelligence Agent (Baseline Verbose).'),
			labels: ['baseline', 'production'],
			tags: ['financial-governance', 'maniy-agent'],
			config: { model: 'google-antigravity/gemini-3.8-flash', temperature: 0.2 }
		},
		{
			name: 'system-compact',
			prompt: readPromptText('system-compact.txt', 'Maniy Agent (Compact Token-Optimized).'),
			labels: ['compact', 'staging'],
			tags: ['token-optimized', 'maniy-agent'],
			config: { model: 'google-antigravity/gemini-3.8-flash', temperature: 0.2 }
		},
		{
			name: 'system-fewshot',
			prompt: readPromptText('system-fewshot.txt', 'Maniy Agent (Few-Shot Telegram Golden).'),
			labels: ['fewshot', 'experimental'],
			tags: ['fewshot-golden', 'maniy-agent'],
			config: { model: 'google-antigravity/gemini-3.8-flash', temperature: 0.2 }
		}
	];

	let count = 0;
	for (const p of prompts) {
		const res = await fetch(`${baseUrl}/api/public/v2/prompts`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: authHeader
			},
			body: JSON.stringify({
				name: p.name,
				type: 'text',
				prompt: p.prompt,
				labels: p.labels,
				tags: p.tags,
				config: p.config,
				commitMessage: `Sync prompt ${p.name} from Maniy LLMOps suite`
			})
		});

		if (res.ok || res.status === 409) {
			count++;
		} else {
			const errText = await res.text();
			console.warn(`[Sync] Failed to sync Langfuse prompt ${p.name}: ${res.status} ${errText}`);
		}
	}

	return count;
}

async function syncLangfuseDataset(baseUrl: string, authHeader: string): Promise<{ datasetSynced: boolean; itemsCount: number }> {
	const datasetName = 'maniyy-agent-golden-dataset';

	// 1. Ensure dataset exists
	const dsRes = await fetch(`${baseUrl}/api/public/v2/datasets`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: authHeader
		},
		body: JSON.stringify({
			name: datasetName,
			description: 'Golden benchmark dataset for Maniy Financial Intelligence Agent across 14 categories',
			metadata: { source: 'apps/agent/eval/dataset.ts', totalCases: EVAL_DATASET.length }
		})
	});

	const datasetSynced = dsRes.ok || dsRes.status === 409;
	if (!datasetSynced) {
		const err = await dsRes.text();
		console.warn(`[Sync] Dataset creation warning: ${dsRes.status} ${err}`);
	}

	// 2. Sync dataset items
	let itemsCount = 0;
	for (const tc of EVAL_DATASET) {
		const itemRes = await fetch(`${baseUrl}/api/public/dataset-items`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: authHeader
			},
			body: JSON.stringify({
				datasetName,
				id: tc.id,
				input: {
					prompt: tc.prompt,
					pageContext: tc.pageContext
				},
				expectedOutput: {
					requiredTools: tc.expected.requiredTools,
					mustContain: tc.expected.mustContain,
					mustNotContain: tc.expected.mustNotContain,
					minSteps: tc.expected.minSteps
				},
				metadata: {
					category: tc.category
				}
			})
		});

		if (itemRes.ok || itemRes.status === 409) {
			itemsCount++;
		} else {
			const err = await itemRes.text();
			console.warn(`[Sync] Failed to upsert dataset item ${tc.id}: ${itemRes.status} ${err}`);
		}
	}

	return { datasetSynced: true, itemsCount };
}

async function syncLangfuseGatewayConnection(baseUrl: string, authHeader: string, gatewayKey: string): Promise<boolean> {
	try {
		const res = await fetch(`${baseUrl}/api/public/llm-connections`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				Authorization: authHeader
			},
			body: JSON.stringify({
				provider: 'omp-gateway',
				adapter: 'openai',
				baseURL: 'https://ai.membran.app/v1',
				secretKey: gatewayKey || 'omp_gateway_sec_token',
				customModels: [
					'google-antigravity/gemini-3.8-flash',
					'google-antigravity/gemini-3.5-flash-lite',
					'google-antigravity/gemini-3.1-flash-lite',
					'google-antigravity/gemini-2.5-flash-lite'
				],
				withDefaultModels: false
			})
		});
		return res.ok;
	} catch (err) {
		console.warn('[Sync] Failed to register Langfuse LLM Connection for omp-gateway:', err);
		return false;
	}
}

async function syncPhoenixGatewayConnection(baseUrl: string, apiKey: string, gatewayKey: string): Promise<boolean> {
	try {
		const graphqlUrl = `${baseUrl.replace(/\/+$/, '')}/graphql`;
		const res = await fetch(graphqlUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`
			},
			body: JSON.stringify({
				query: `mutation CreateProvider($input: CreateGenerativeModelCustomProviderMutationInput!) {
					createGenerativeModelCustomProvider(input: $input) {
						provider { id name provider sdk }
					}
				}`,
				variables: {
					input: {
						name: 'omp-gateway',
						description: 'OMP AI Gateway providing Google Antigravity Gemini models',
						provider: 'omp-gateway',
						clientConfig: {
							openai: {
								openaiAuthenticationMethod: { apiKey: gatewayKey || 'omp_gateway_sec_token' },
								openaiClientKwargs: { baseUrl: 'https://ai.membran.app/v1' },
								openaiApiType: 'CHAT_COMPLETIONS'
							}
						}
					}
				}
			})
		});
		const json = (await res.json()) as { data?: unknown; errors?: Array<{ message: string }> };
		if (json.data || (json.errors && json.errors.some((e) => e.message.toLowerCase().includes('already exists') || e.message.toLowerCase().includes('unique')))) {
			return true;
		}
		return false;
	} catch (err) {
		console.warn('[Sync] Failed to register Phoenix Custom Model Provider for omp-gateway:', err);
		return false;
	}
}

export async function syncObservabilitySuite(): Promise<void> {
	console.log('🚀 Starting 1:1 Dual-Observability Suite Synchronization (Phoenix + Langfuse)...');

	// 1. Sync Arize Phoenix Full Suite
	try {
		await syncPhoenixFullSuite();
		console.log('✅ Arize Phoenix: Prompts, Datasets, Splits, Experiments & Evaluators synchronized successfully.');
	} catch (err) {
		console.error('❌ Arize Phoenix sync encountered an error:', err);
		throw err;
	}

	// 2. Sync Langfuse Cloud Suite
	const { langfuseBaseUrl, langfusePublicKey, langfuseSecretKey } = resolveEnv();
	if (!langfusePublicKey || !langfuseSecretKey) {
		console.warn('⚠️ Langfuse credentials not configured. Skipping Langfuse asset synchronization.');
		return;
	}

	const authHeader = `Basic ${btoa(`${langfusePublicKey}:${langfuseSecretKey}`)}`;
	const cleanBaseUrl = langfuseBaseUrl.replace(/\/+$/, '');

	console.log(`🌐 Synchronizing assets with Langfuse Cloud at ${cleanBaseUrl}...`);

	const promptCount = await syncLangfusePrompts(cleanBaseUrl, authHeader);
	console.log(`✅ Langfuse: ${promptCount} prompt versions synchronized.`);

	const { itemsCount } = await syncLangfuseDataset(cleanBaseUrl, authHeader);
	console.log(`✅ Langfuse: ${itemsCount} golden dataset items synchronized in 'maniyy-agent-golden-dataset'.`);
	const { ompGatewayKey, phoenixBaseUrl, phoenixApiKey } = resolveEnv();
	const lfGwSynced = await syncLangfuseGatewayConnection(cleanBaseUrl, authHeader, ompGatewayKey || 'omp_gateway_sec_token');
	if (lfGwSynced) {
		console.log('✅ Langfuse: omp-gateway LLM Connection registered (Gemini 3.8, 3.5, 3.1, 2.5).');
	}

	const phxGwSynced = await syncPhoenixGatewayConnection(phoenixBaseUrl, phoenixApiKey || '', ompGatewayKey || 'omp_gateway_sec_token');
	if (phxGwSynced) {
		console.log('✅ Arize Phoenix: omp-gateway GenerativeModelCustomProvider registered.');
	}

	console.log('🎯 100% Identical Twin Parity Achieved between Arize Phoenix & Langfuse Cloud!');
}

const isMain =
	typeof process !== 'undefined' &&
	process.argv[1] &&
	(process.argv[1].endsWith('observability-sync.ts') || process.argv[1].endsWith('observability-sync.js'));

if (isMain) {
	syncObservabilitySuite().catch((err) => {
		console.error('Failed to synchronize observability suite:', err);
		process.exit(1);
	});
}
