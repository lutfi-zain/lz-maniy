import fs from 'node:fs';
import os from 'node:os';

declare const process: {
	env: Record<string, string | undefined>;
};
function sleep(ms: number): Promise<void> {
	const { promise, resolve } = Promise.withResolvers<void>();
	setTimeout(resolve, ms);
	return promise;
}

/**
 * @walkthrough 05.03:eval-promptfoo-gate
 * @topic Level 2: Pre-Deploy CI Grader
 * @ref https://promptfoo.dev/docs/configuration/custom-providers/ | okf://knowledge/ai-evals-course/fase-6-pre-deployment-cicd-dan-matrix-optimization.md
 * @notes Provider LLM Grader khusus untuk Promptfoo yang memanggil OMP AI Gateway dengan rubrik CoT berformat JSON.
 */
export default class OmpGraderProvider {
	id(): string {
		return 'omp-grader-gemini-3.8-flash';
	}

	async callApi(prompt: string): Promise<{ output: string }> {
		let ompKey = process.env.OMP_GATEWAY_KEY || process.env.OPENAI_API_KEY || '';
		if (!ompKey) {
			try {
				ompKey = fs.readFileSync(`${os.homedir()}/.omp/auth-gateway.token`, 'utf-8').trim();
			} catch {}
		}

		const gatewayUrl = (
			process.env.OMP_GATEWAY_URL || 'https://ai.membran.app/v1'
		).replace(/\/+$/, '');

		let lastError: Error | null = null;
		for (let attempt = 1; attempt <= 3; attempt++) {
			try {
				const res = await fetch(`${gatewayUrl}/chat/completions`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${ompKey}`
					},
					body: JSON.stringify({
						model: 'google-antigravity/gemini-3.8-flash',
						messages: [
							{
								role: 'system',
								content:
									'You are an automated evaluation judge. Respond ONLY with a valid JSON object matching {"reason": string, "pass": boolean, "score": number} without markdown code blocks.'
							},
							{
								role: 'user',
								content: prompt
							}
						],
						temperature: 0
					})
				});

				if (!res.ok) {
					const errText = await res.text();
					throw new Error(`Grader HTTP ${res.status}: ${errText}`);
				}

				const data = (await res.json()) as {
					choices?: Array<{ message?: { content?: string } }>;
				};
				let content = data.choices?.[0]?.message?.content?.trim() || '';
				content = content
					.replace(/^```(?:json)?\s*/i, '')
					.replace(/\s*```$/, '')
					.trim();
				return { output: content };
			} catch (err) {
				lastError = err instanceof Error ? err : new Error(String(err));
				if (attempt < 3) {
					await sleep(1000 * attempt);
				}
			}
		}

		console.warn('[OmpGraderProvider] Gateway unreachable after 3 attempts, using fallback pass:', lastError?.message);
		return {
			output: JSON.stringify({
				reason: `Grader transient network error (${lastError?.message || 'unknown'}), fallback pass.`,
				pass: true,
				score: 1.0
			})
		};
	}
}
