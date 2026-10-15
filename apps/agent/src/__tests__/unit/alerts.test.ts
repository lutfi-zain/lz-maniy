import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { sendTelegramAlert, type TelegramAlertPayload } from '../../observability/alerts.js';
import type { Env } from '../../types.js';

describe('Telegram Incident Alerts Deep-Linking', () => {
	let mockFetch: Mock;

	beforeEach(() => {
		mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			text: async () => 'ok'
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
			PHOENIX_PROJECT_NAME: 'maniyy-agent-evals',
			TELEGRAM_BOT_TOKEN: 'test_token',
			TELEGRAM_ALERT_CHAT_ID: '12345',
			...overrides
		};
	}

	it('includes direct trace detail links when phoenixTraceId is provided', async () => {
		const env = createMockEnv();
		const payload: TelegramAlertPayload = {
			title: 'Automated Eval Alert: Anomaly Detected',
			sessionId: 'conv-999',
			userId: 'user-888',
			phoenixTraceId: 'trace-abc-123',
			score: 0.0,
			reason: 'Hallucinated balance',
			userMessage: 'Berapa saldo saya?',
			assistantOutput: 'Saldo Rp 100.000.000'
		};

		const sent = await sendTelegramAlert(env, payload);
		expect(sent).toBe(true);
		expect(mockFetch).toHaveBeenCalledTimes(1);

		const body = JSON.parse(mockFetch.mock.calls[0][1].body);
		expect(body.text).toContain('[Arize Phoenix](https://phoenix.test/projects/maniyy-agent-evals/traces/trace-abc-123)');
		expect(body.text).toContain('[Langfuse Cloud](https://langfuse.test/project/default/traces/trace-abc-123)');
	});

	it('falls back to generic dashboard links when phoenixTraceId is omitted', async () => {
		const env = createMockEnv();
		const payload: TelegramAlertPayload = {
			title: 'P99 Latency SLA Breach',
			sessionId: 'conv-999',
			latencyMs: 26000
		};

		const sent = await sendTelegramAlert(env, payload);
		expect(sent).toBe(true);
		expect(mockFetch).toHaveBeenCalledTimes(1);

		const body = JSON.parse(mockFetch.mock.calls[0][1].body);
		expect(body.text).toContain('[Arize Phoenix](https://phoenix.test)');
		expect(body.text).toContain('[Langfuse Cloud](https://langfuse.test)');
	});

	it('returns false and skips when TELEGRAM_BOT_TOKEN is missing', async () => {
		const env = createMockEnv({ TELEGRAM_BOT_TOKEN: undefined });
		const sent = await sendTelegramAlert(env, { title: 'Test Alert' });
		expect(sent).toBe(false);
		expect(mockFetch).not.toHaveBeenCalled();
	});
});
