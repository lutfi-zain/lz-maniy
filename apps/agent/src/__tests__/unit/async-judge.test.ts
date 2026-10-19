import { describe, it, expect, vi } from 'vitest';
import {
	buildJudgePrompt,
	parseJudgeResponse,
	runAsyncJudge,
	type ConsolidatedJudgeOutput
} from '../../observability/async-judge.js';
import type { Env } from '../../types.js';

describe('Consolidated Semantic LLM-as-a-Judge', () => {
	it('builds prompt containing turn input and rubric constraints', () => {
		const prompt = buildJudgePrompt({
			userMessage: 'Bolehkah saya pakai uang Sewa Rumah untuk liburan?',
			assistantOutput: 'Tidak boleh, kas tersebut berstatus terkunci sebagai komitmen.',
			toolResultsJson: '{"balance": 5000000}'
		});

		expect(prompt).toContain('Bolehkah saya pakai uang Sewa Rumah');
		expect(prompt).toContain('Tidak boleh, kas tersebut berstatus terkunci');
		expect(prompt).toContain('{"balance": 5000000}');
		expect(prompt).toContain('Financial Soundness');
		expect(prompt).toContain('Persona & Tone Governance');
		expect(prompt).toContain('Tool Trajectory & Efficiency');
	});

	it('parses valid JSON judge response with code block wrapping', () => {
		const rawResponse = `\`\`\`json
{
  "evaluator": "consolidated_judge",
  "overallScore": 0.95,
  "pass": true,
  "reasoning": "Assistant correctly defended locked reserves and followed Eve persona tone.",
  "financialSoundness": {
    "score": 1.0,
    "lockedCashDefended": true,
    "deficitHandled": true,
    "arithmeticConsistent": true,
    "isApplicable": true,
    "explanation": "Locked cash defended"
  },
  "personaTone": {
    "score": 0.9,
    "zeroEmojis": true,
    "currencyCompliant": true,
    "explanation": "No emojis detected"
  },
  "toolTrajectory": {
    "score": 1.0,
    "toolSelectionAccurate": true,
    "redundantCallsAvoided": true,
    "explanation": "Optimal trajectory"
  }
}
\`\`\``;

		const parsed = parseJudgeResponse(rawResponse);
		expect(parsed.evaluator).toBe('consolidated_judge');
		expect(parsed.overallScore).toBe(0.95);
		expect(parsed.pass).toBe(true);
		expect(parsed.financialSoundness.lockedCashDefended).toBe(true);
		expect(parsed.personaTone.zeroEmojis).toBe(true);
	});

	it('invokes mock OMP AI Gateway and handles multi-currency response', async () => {
		const mockJudgePayload: ConsolidatedJudgeOutput = {
			evaluator: 'consolidated_judge',
			overallScore: 1.0,
			pass: true,
			reasoning: 'Multi-currency USDT handling is accurate and compliant.',
			financialSoundness: {
				score: 1.0,
				lockedCashDefended: true,
				deficitHandled: true,
				arithmeticConsistent: true,
				isApplicable: true,
				explanation: 'Valid crypto calculations'
			},
			personaTone: {
				score: 1.0,
				zeroEmojis: true,
				currencyCompliant: true,
				explanation: 'USDT allowed, zero emojis'
			},
			toolTrajectory: {
				score: 1.0,
				toolSelectionAccurate: true,
				redundantCallsAvoided: true,
				explanation: 'Accurate tool invocation'
			}
		};

		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				choices: [
					{
						message: {
							content: JSON.stringify(mockJudgePayload)
						}
					}
				]
			})
		});

		const env = {
			OMP_GATEWAY_URL: 'https://ai.membran.app/v1',
			OMP_GATEWAY_KEY: 'test-key'
		} as unknown as Env;

		const result = await runAsyncJudge(
			{
				userMessage: 'Berapa saldo wallet Binance saya?',
				assistantOutput: 'Saldo Binance Anda adalah 115.61 USDT.',
				toolResultsJson: '{"symbol":"USDT","balance":115.61}'
			},
			env,
			mockFetch as unknown as typeof fetch
		);

		expect(result.pass).toBe(true);
		expect(result.overallScore).toBe(1.0);
		expect(mockFetch).toHaveBeenCalledOnce();
	});

	it('returns fallback audit when gateway returns an error', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 502,
			text: async () => 'Gateway Bad Gateway'
		});

		const env = {
			OMP_GATEWAY_URL: 'https://ai.membran.app/v1'
		} as unknown as Env;

		const result = await runAsyncJudge(
			{
				userMessage: 'Test',
				assistantOutput: 'Test response'
			},
			env,
			mockFetch as unknown as typeof fetch
		);

		expect(result.pass).toBe(false);
		expect(result.overallScore).toBe(0.0);
		expect(result.reasoning).toContain('Gateway Bad Gateway');
	});
});
