import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { streamScoresToLangfuse } from '../../routes/chat.js';
import type { EvaluationResult } from '../../observability/evaluators.js';
import type { Env } from '../../types.js';

describe('Chat Continuous Evaluation Scores Streaming', () => {
	let mockFetch: Mock;

	beforeEach(() => {
		mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			text: async () => 'ok',
			json: async () => ({ ok: true })
		});
		globalThis.fetch = mockFetch as unknown as typeof fetch;
	});

	function createMockEnv(overrides: Partial<Env> = {}): Env {
		return {
			DB: {} as D1Database,
			CONFIG: {} as KVNamespace,
			REEDRICH_API_URL: 'https://reedrich.test',
			GEMINI_API_KEY: 'test-gemini',
			GROQ_API_KEY: 'test-groq',
			LANGFUSE_PUBLIC_KEY: 'pk-test',
			LANGFUSE_SECRET_KEY: 'sk-test',
			LANGFUSE_BASE_URL: 'https://langfuse.test',
			LANGFUSE_ENABLED: 'true',
			PHOENIX_ENDPOINT: 'https://phoenix.test/v1/traces',
			PHOENIX_API_KEY: 'phx_test',
			TELEGRAM_BOT_TOKEN: 'test_token',
			TELEGRAM_ALERT_CHAT_ID: '12345',
			...overrides
		};
	}

	it('streams evaluation results to Langfuse Scores API', async () => {
		const env = createMockEnv();
		const results: EvaluationResult[] = [
			{ name: 'numeric_grounding', score: 1.0, label: 'grounded', kind: 'CODE' },
			{ name: 'currency_governance', score: 1.0, label: 'pass', kind: 'CODE' }
		];

		await streamScoresToLangfuse(env, results, 'trace-123', 'conv-456');

		expect(mockFetch).toHaveBeenCalledTimes(2);
		const firstCall = mockFetch.mock.calls[0];
		expect(firstCall[0]).toBe('https://langfuse.test/api/public/scores');
		const body = JSON.parse(firstCall[1].body);
		expect(body.name).toBe('numeric_grounding');
		expect(body.value).toBe(1.0);
		expect(body.traceId).toBe('trace-123');
		expect(body.sessionId).toBe('conv-456');
		expect(body.dataType).toBe('NUMERIC');
	});

	it('skips streaming if Langfuse is disabled or keys missing', async () => {
		const envDisabled = createMockEnv({ LANGFUSE_ENABLED: 'false' });
		const results: EvaluationResult[] = [
			{ name: 'numeric_grounding', score: 1.0, label: 'grounded', kind: 'CODE' }
		];

		await streamScoresToLangfuse(envDisabled, results, 'trace-123', 'conv-456');
		expect(mockFetch).not.toHaveBeenCalled();

		const envNoKeys = createMockEnv({ LANGFUSE_PUBLIC_KEY: undefined });
		await streamScoresToLangfuse(envNoKeys, results, 'trace-123', 'conv-456');
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('safely handles network errors without throwing', async () => {
		mockFetch.mockRejectedValue(new Error('Network error'));
		const env = createMockEnv();
		const results: EvaluationResult[] = [
			{ name: 'numeric_grounding', score: 0.0, label: 'fail', kind: 'CODE', explanation: 'Failed' }
		];

		await expect(
			streamScoresToLangfuse(env, results, 'trace-123', 'conv-456')
		).resolves.toBeUndefined();
	});
});
