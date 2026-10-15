import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { feedbackRouter } from '../../routes/feedback.js';
import type { Env } from '../../types.js';

describe('Feedback Router (POST /api/chat/feedback)', () => {
	let mockFeedbacks: Array<Record<string, unknown>> = [];
	let mockFetch: Mock;

	beforeEach(() => {
		mockFeedbacks = [];
		mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			text: async () => 'ok',
			json: async () => ({ ok: true })
		});
		globalThis.fetch = mockFetch as unknown as typeof fetch;
	});

	function createMockEnv(): Env {
		const db = {
			prepare(sql: string) {
				let boundArgs: unknown[] = [];
				return {
					bind(...args: unknown[]) {
						boundArgs = args;
						return this;
					},
					async run() {
						if (sql.includes('INSERT INTO feedbacks')) {
							const [id, user_id, conversation_id, message_id, score, reason, trace_id, created_at] = boundArgs;
							mockFeedbacks.push({ id, user_id, conversation_id, message_id, score, reason, trace_id, created_at });
							return { meta: { changes: 1 } };
						}
						return { meta: { changes: 0 } };
					}
				};
			}
		} as unknown as D1Database;

		return {
			DB: db,
			CONFIG: {} as KVNamespace,
			REEDRICH_API_URL: 'https://reedrich.test',
			GEMINI_API_KEY: 'test-gemini',
			GROQ_API_KEY: 'test-groq',
			LANGFUSE_PUBLIC_KEY: 'pk-test',
			LANGFUSE_SECRET_KEY: 'sk-test',
			LANGFUSE_BASE_URL: 'https://langfuse.test',
			LANGFUSE_ENABLED: 'true',
			LANGFUSE_USER_FEEDBACK_CONFIG_ID: 'cfg_feedback_123',
			PHOENIX_ENDPOINT: 'https://phoenix.test/v1/traces',
			PHOENIX_API_KEY: 'phx_test',
			TELEGRAM_BOT_TOKEN: 'test_token',
			TELEGRAM_ALERT_CHAT_ID: '12345'
		};
	}

	it('returns 400 when missing required fields', async () => {
		const env = createMockEnv();
		const res = await feedbackRouter.request('/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: 'Bearer test_token'
			},
			body: JSON.stringify({ score: 1 })
		}, env);

		expect(res.status).toBe(400);
	});

	it('records positive feedback (score 1) and streams to Phoenix and Langfuse without alert', async () => {
		const env = createMockEnv();
		const waitPromises: Promise<unknown>[] = [];
		const executionCtx = {
			waitUntil(p: Promise<unknown>) {
				waitPromises.push(p);
			}
		};

		const res = await feedbackRouter.request(
			'/',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Bearer test_token'
				},
				body: JSON.stringify({
					messageId: 'msg_1',
					conversationId: 'conv_1',
					score: 1.0,
					reason: 'Good answer'
				})
			},
			env,
			executionCtx as unknown as ExecutionContext
		);

		expect(res.status).toBe(200);
		const json = (await res.json()) as { success: boolean; score: number };
		expect(json.success).toBe(true);
		expect(json.score).toBe(1.0);
		expect(mockFeedbacks.length).toBe(1);
		expect(mockFeedbacks[0].score).toBe(1.0);

		await Promise.all(waitPromises);

		// Assert fetch calls: Langfuse score + Phoenix session annotation, NO telegram alert
		const urls = mockFetch.mock.calls.map((c: [string]) => c[0]);
		expect(urls.some((u: string) => u.includes('langfuse.test/api/public/scores'))).toBe(true);
		expect(urls.some((u: string) => u.includes('phoenix.test/v1/project_session_annotations'))).toBe(true);
		expect(urls.some((u: string) => u.includes('api.telegram.org'))).toBe(false);
		const lfCall = mockFetch.mock.calls.find((c: [string]) => c[0].includes('langfuse.test/api/public/scores'));
		expect(lfCall).toBeDefined();
		const lfBody = JSON.parse(lfCall[1].body);
		expect(lfBody.dataType).toBe('CATEGORICAL');
		expect(lfBody.value).toBe('positive');
		expect(lfBody.configId).toBe('cfg_feedback_123');
	});

	it('records negative feedback (score 0) and triggers Telegram alert', async () => {
		const env = createMockEnv();
		const waitPromises: Promise<unknown>[] = [];
		const executionCtx = {
			waitUntil(p: Promise<unknown>) {
				waitPromises.push(p);
			}
		};

		const res = await feedbackRouter.request(
			'/',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Bearer test_token'
				},
				body: JSON.stringify({
					messageId: 'msg_2',
					conversationId: 'conv_2',
					score: 0.0,
					reason: 'Hallucinated balance'
				})
			},
			env,
			executionCtx as unknown as ExecutionContext
		);

		expect(res.status).toBe(200);
		expect(mockFeedbacks.length).toBe(1);
		expect(mockFeedbacks[0].score).toBe(0.0);

		await Promise.all(waitPromises);

		// Negative feedback triggers Telegram alert
		const urls = mockFetch.mock.calls.map((c: [string]) => c[0]);
		expect(urls.some((u: string) => u.includes('api.telegram.org'))).toBe(true);
		const negLfCall = mockFetch.mock.calls.find((c: [string]) => c[0].includes('langfuse.test/api/public/scores'));
		expect(negLfCall).toBeDefined();
		const negLfBody = JSON.parse(negLfCall[1].body);
		expect(negLfBody.dataType).toBe('CATEGORICAL');
		expect(negLfBody.value).toBe('negative');
		expect(negLfBody.configId).toBe('cfg_feedback_123');
	});
});
