import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { DBEvalCandidate } from '../src/db/queries.js';
import { CANONICAL_CATEGORIES, type DomainCategory } from '../src/observability/flywheel.js';

declare const process: {
	env: Record<string, string | undefined>;
	argv: string[];
	exit: (code?: number) => never;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface FlywheelSyncEnv {
	langfuseBaseUrl: string;
	langfusePublicKey?: string;
	langfuseSecretKey?: string;
	phoenixApiKey?: string;
	phoenixBaseUrl: string;
}

function resolveEnv(): FlywheelSyncEnv {
	let langfusePublicKey = process.env.LANGFUSE_PUBLIC_KEY;
	let langfuseSecretKey = process.env.LANGFUSE_SECRET_KEY;
	let langfuseBaseUrl = process.env.LANGFUSE_BASE_URL || 'https://us.cloud.langfuse.com';
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
					if (key === 'PHOENIX_API_KEY' && !process.env.PHOENIX_API_KEY) phoenixApiKey = val;
				}
			}
		}
	}

	return { langfuseBaseUrl, langfusePublicKey, langfuseSecretKey, phoenixApiKey, phoenixBaseUrl };
}

/**
 * Fetch staged candidates from D1 using local wrangler CLI or JSON fixture
 */
export function fetchStagedCandidates(fixturePath?: string): DBEvalCandidate[] {
	if (fixturePath && fs.existsSync(fixturePath)) {
		const raw = fs.readFileSync(fixturePath, 'utf8');
		return JSON.parse(raw) as DBEvalCandidate[];
	}

	try {
		const cmd = `npx wrangler d1 execute maniyy-agent-db --local --json --command "SELECT * FROM eval_dataset_candidates WHERE status = 'staged' ORDER BY created_at ASC"`;
		const output = execSync(cmd, { cwd: path.resolve(__dirname, '..'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
		const parsed = JSON.parse(output);
		if (Array.isArray(parsed) && parsed[0]?.results) {
			return parsed[0].results as DBEvalCandidate[];
		}
	} catch {
		// Fallback if local miniflare DB has not been initialized yet
	}

	return [];
}

/**
 * Serialize candidates into EvalTestCase format and append to eval/dataset.ts
 */
export function exportCandidatesToDataset(candidates: DBEvalCandidate[], datasetPath?: string): number {
	if (candidates.length === 0) return 0;

	const targetPath = datasetPath || path.resolve(__dirname, 'dataset.ts');
	let content = fs.readFileSync(targetPath, 'utf8');

	// Extract highest existing test case number
	const tcMatches = Array.from(content.matchAll(/id:\s*['"]TC-(\d+)['"]/g));
	let maxNum = 72;
	for (const m of tcMatches) {
		const n = parseInt(m[1], 10);
		if (n > maxNum) maxNum = n;
	}

	let exportedCount = 0;
	let appendBuffer = '';

	for (const candidate of candidates) {
		// Validate category against canonical union
		let category: DomainCategory = 'complex_reasoning';
		if ((CANONICAL_CATEGORIES as readonly string[]).includes(candidate.domain_category)) {
			category = candidate.domain_category as DomainCategory;
		}

		maxNum++;
		const tcId = `TC-${String(maxNum).padStart(2, '0')}`;

		// Extract required tools from sanitized tool calls payload
		let requiredTools: string[] = [];
		if (candidate.sanitized_tool_calls_json) {
			try {
				const parsed = JSON.parse(candidate.sanitized_tool_calls_json);
				if (Array.isArray(parsed)) {
					requiredTools = parsed
						.map((t: Record<string, unknown>) => (typeof t.name === 'string' ? t.name : ''))
						.filter(Boolean);
				}
			} catch {
				/* ignore */
			}
		}

		appendBuffer += `,\n\t{\n`;
		appendBuffer += `\t\tid: '${tcId}',\n`;
		appendBuffer += `\t\tcategory: '${category}',\n`;
		appendBuffer += `\t\tprompt: ${JSON.stringify(candidate.sanitized_prompt)},\n`;
		appendBuffer += `\t\texpected: {\n`;
		appendBuffer += `\t\t\trequiredTools: ${JSON.stringify(requiredTools)},\n`;
		appendBuffer += `\t\t\tmustNotContain: ['$', '⚠️', '👍', '😊'],\n`;
		appendBuffer += `\t\t\tminSteps: 1\n`;
		appendBuffer += `\t\t}\n`;
		appendBuffer += `\t}`;
		exportedCount++;
	}

	// Insert before the last `];`
	const lastBracketIdx = content.lastIndexOf('];');
	if (lastBracketIdx !== -1) {
		content = content.slice(0, lastBracketIdx).trimEnd() + appendBuffer + '\n];\n';
		fs.writeFileSync(targetPath, content, 'utf8');
	}

	return exportedCount;
}

/**
 * Push candidates to Langfuse dataset
 */
export async function pushToLangfuseDataset(
	candidates: DBEvalCandidate[],
	env: FlywheelSyncEnv
): Promise<number> {
	if (!env.langfusePublicKey || !env.langfuseSecretKey || candidates.length === 0) return 0;

	const datasetName = 'production-failures-regression';
	const authHeader = `Basic ${btoa(`${env.langfusePublicKey}:${env.langfuseSecretKey}`)}`;
	const baseUrl = env.langfuseBaseUrl.replace(/\/+$/, '');

	// Ensure dataset exists
	try {
		await fetch(`${baseUrl}/api/public/datasets`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: authHeader },
			body: JSON.stringify({ name: datasetName, description: 'Production failure cases curated via Dataset Flywheel' })
		});
	} catch {
		/* ignore if exists */
	}

	let pushed = 0;
	for (const c of candidates) {
		try {
			const res = await fetch(`${baseUrl}/api/public/dataset-items`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: authHeader },
				body: JSON.stringify({
					datasetName,
					id: `PROD-${c.id.slice(0, 8)}`,
					input: { prompt: c.sanitized_prompt },
					expectedOutput: { output: c.sanitized_output },
					metadata: {
						category: c.domain_category,
						rubric: c.evaluator_rubric,
						score: c.judge_score,
						reasoning: c.judge_reasoning,
						sourceTraceId: c.source_trace_id
					}
				})
			});
			if (res.ok || res.status === 409) pushed++;
		} catch (err) {
			console.warn(`[FlywheelSync] Failed to push item ${c.id} to Langfuse:`, err);
		}
	}

	return pushed;
}

/**
 * Push candidates to Arize Phoenix dataset
 */
export async function pushToPhoenixDataset(
	candidates: DBEvalCandidate[],
	env: FlywheelSyncEnv
): Promise<number> {
	if (!env.phoenixBaseUrl || candidates.length === 0) return 0;

	let pushed = 0;
	const url = `${env.phoenixBaseUrl}/v1/datasets`;

	try {
		for (const c of candidates) {
			const res = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(env.phoenixApiKey ? { 'api-key': env.phoenixApiKey } : {})
				},
				body: JSON.stringify({
					name: 'maniyy-agent-production-edge-cases',
					examples: [
						{
							input: { prompt: c.sanitized_prompt },
							output: { response: c.sanitized_output },
							metadata: {
								category: c.domain_category,
								rubric: c.evaluator_rubric,
								score: c.judge_score,
								sourceTraceId: c.source_trace_id
							}
						}
					]
				})
			});
			if (res.ok || res.status === 409) pushed++;
		}
	} catch (err) {
		console.warn('[FlywheelSync] Failed to push items to Phoenix dataset:', err);
	}

	return pushed;
}

// CLI Entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
	const env = resolveEnv();
	const action = process.argv[2] || 'all';

	console.log(`[FlywheelSync] Starting dataset flywheel synchronization (action: ${action})...`);
	const candidates = fetchStagedCandidates();
	console.log(`[FlywheelSync] Retrieved ${candidates.length} staged candidates.`);

	if (action === 'export' || action === 'all') {
		const exported = exportCandidatesToDataset(candidates);
		console.log(`[FlywheelSync] Exported ${exported} candidates to apps/agent/eval/dataset.ts.`);
	}

	if (action === 'push-remote' || action === 'all') {
		pushToLangfuseDataset(candidates, env).then((lf) => {
			console.log(`[FlywheelSync] Pushed ${lf} candidates to Langfuse dataset.`);
		});
		pushToPhoenixDataset(candidates, env).then((phx) => {
			console.log(`[FlywheelSync] Pushed ${phx} candidates to Phoenix dataset.`);
		});
	}
}
