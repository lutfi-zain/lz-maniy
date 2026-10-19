import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { feedbackRouter } from '../../routes/feedback.js';
import type { Env } from '../../types.js';

describe('Feedback Router (POST /api/chat/feedback)', () => {
	let mockFeedbacks: Array<Record<string, unknown>> = [];
	let mockEvalQueue: Array<Record<string, unknown>> = [];
	let mockFetch: Mock;
	let authorizedMessage = true;

	beforeEach(() => {
		mockFeedbacks = [];
		mockEvalQueue = [];
		authorizedMessage = true;
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
						if (sql.includes('INSERT INTO eval_queue')) {
							const [id, trace_id, session_id, user_id, priority, user_message, assistant_output, tool_results_json, trigger_reason, created_at] = boundArgs;
							mockEvalQueue.push({ id, trace_id, session_id, user_id, priority, user_message, assistant_output, tool_results_json, trigger_reason, created_at });
							return { meta: { changes: 1 } };
						}
						return { meta: { changes: 0 } };
					},
					async first() {
						if (sql.includes('SELECT m.content, m.role, m.tool_results')) {
							if (!authorizedMessage) return null;
							return {
								content: 'Jawaban Eve terkait saldo...',
								role: 'assistant',
								tool_results: '[]'
							};
						}
						if (sql.includes("SELECT content FROM messages WHERE conversation_id = ? AND role = 'user'")) {
							return { content: 'Pertanyaan user...' };
						}
						return null;
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
		const res = await feedbackRouter.request(
			'/',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Bearer test_token'
				},
				body: JSON.stringify({ score: 1 })
			},
			env
		);

		expect(res.status).toBe(400);
	});

	it('returns 403 when message does not belong to authenticated user', async () => {
		authorizedMessage = false;
		const env = createMockEnv();
		const res = await feedbackRouter.request(
			'/',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Bearer test_token'
				},
				body: JSON.stringify({
					messageId: 'msg_other_user',
					conversationId: 'conv_other',
					score: 0.0
				})
			},
			env
		);

		expect(res.status).toBe(403);
		const json = (await res.json()) as { error: string };
		expect(json.error).toBe('Message not found or unauthorized');
	});

	it('records positive feedback (score 1) and streams to Phoenix and Langfuse without alert or eval enqueue', async () => {
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

		// Assert fetch calls: Langfuse score + Phoenix session annotation, NO telegram alert, NO eval_queue enqueue
		const urls = mockFetch.mock.calls.map((callArgs: unknown[]) => String(callArgs[0]));
		expect(urls.some((u: string) => u.includes('langfuse.test/api/public/scores'))).toBe(true);
		expect(urls.some((u: string) => u.includes('phoenix.test/v1/project_session_annotations'))).toBe(true);
		expect(urls.some((u: string) => u.includes('api.telegram.org'))).toBe(false);
		expect(mockEvalQueue.length).toBe(0);
	});

	it('records negative feedback (score 0), triggers Telegram alert, and enqueues high-priority eval job', async () => {
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
					reason: 'Hallucinated balance',
					traceId: 'tr_feedback_999'
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
		const urls = mockFetch.mock.calls.map((callArgs: unknown[]) => String(callArgs[0]));
		expect(urls.some((u: string) => u.includes('api.telegram.org'))).toBe(true);

		// High priority eval job enqueued
		expect(mockEvalQueue.length).toBe(1);
		expect(mockEvalQueue[0].priority).toBe('high');
		expect(mockEvalQueue[0].trigger_reason).toBe('negative_feedback');
		expect(mockEvalQueue[0].trace_id).toBe('tr_feedback_999');
	});
});
