import fs from 'node:fs';
import os from 'node:os';

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
			throw new Error(`Grader HTTP ${res.status}: ${await res.text()}`);
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
	}
}
