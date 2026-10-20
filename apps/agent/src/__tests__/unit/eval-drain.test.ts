import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { evalRouter, drainEvalQueue } from '../../routes/eval.js';
import type { DBEvalQueueJob, DBEvalCandidate } from '../../db/queries.js';
import type { Env } from '../../types.js';

describe('Dual-Trigger Evaluation Queue Draining & Router', () => {
	let mockJobs: DBEvalQueueJob[] = [];
	let mockCandidates: DBEvalCandidate[] = [];
	let mockFetch: Mock;

	beforeEach(() => {
		mockJobs = [];
		mockCandidates = [];
		mockFetch = vi.fn().mockImplementation((url: string) => {
			if (url.includes('/chat/completions')) {
				// Return passing judge output
				return Promise.resolve({
					ok: true,
					json: async () => ({
						choices: [
							{
								message: {
									content: JSON.stringify({
										evaluator: 'consolidated_judge',
										overallScore: 0.95,
										pass: true,
										reasoning: 'Compliant turn',
										financialSoundness: {
											score: 1.0,
											lockedCashDefended: true,
											deficitHandled: true,
											arithmeticConsistent: true,
											isApplicable: true
										},
										personaTone: {
											score: 0.9,
											zeroEmojis: true,
											currencyCompliant: true
										},
										toolTrajectory: {
											score: 1.0,
											toolSelectionAccurate: true,
											redundantCallsAvoided: true
										}
									})
								}
							}
						]
					})
				});
			}
			return Promise.resolve({
				ok: true,
				text: async () => 'ok',
				json: async () => ({ ok: true })
			});
		});
		globalThis.fetch = mockFetch as unknown as typeof fetch;
	});

	function createMockEnv(overrides: Partial<Env> = {}): Env {
		const db = {
			prepare(sql: string) {
				let boundArgs: unknown[] = [];
				return {
					bind(...args: unknown[]) {
						boundArgs = args;
						return this;
					},
					async run() {
						if (sql.includes('UPDATE eval_queue') && sql.includes("SET status = 'processing'")) {
							const [lockedAt, id] = boundArgs as [number, string];
							const job = mockJobs.find((j) => j.id === id && j.status === 'pending');
							if (job) {
								job.status = 'processing';
								job.locked_at = lockedAt;
								job.attempts += 1;
								return { meta: { changes: 1 } };
							}
						}
						if (sql.includes('UPDATE eval_queue') && sql.includes("status = 'pending'")) {
							return { meta: { changes: 0 } };
						}
						if (sql.includes('UPDATE eval_queue') && sql.includes('processed_at = ?')) {
							const [status, processedAt, lastError, id] = boundArgs as [DBEvalQueueJob['status'], number, string | null, string];
							const job = mockJobs.find((j) => j.id === id);
							if (job) {
								job.status = status;
								job.processed_at = processedAt;
								job.last_error = lastError;
								return { meta: { changes: 1 } };
							}
						}
						if (sql.includes('INSERT INTO eval_dataset_candidates')) {
							const [id, sourceTraceId, sourceSessionId, rubric, category, prompt, output, tools, score, reasoning, createdAt] = boundArgs as [string, string, string, string, string, string, string, string | null, number, string, number];
							mockCandidates.push({
								id,
								source_trace_id: sourceTraceId,
								source_session_id: sourceSessionId,
								evaluator_rubric: rubric,
								domain_category: category,
								sanitized_prompt: prompt,
								sanitized_output: output,
								sanitized_tool_calls_json: tools,
								judge_score: score,
								judge_reasoning: reasoning,
								status: 'staged',
								created_at: createdAt
							});
							return { meta: { changes: 1 } };
						}
						return { meta: { changes: 0 } };
					},
					async all() {
						if (sql.includes("SELECT * FROM eval_queue WHERE status = 'pending'")) {
							const limit = typeof boundArgs[boundArgs.length - 1] === 'number'
								? (boundArgs[boundArgs.length - 1] as number)
								: undefined;
							const pending = mockJobs.filter((j) => j.status === 'pending');
							return { results: limit !== undefined ? pending.slice(0, limit) : [...pending] };
						}
						return { results: [] };
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
			OMP_GATEWAY_URL: 'https://ai.membran.app/v1',
			OMP_GATEWAY_KEY: 'test-omp-key',
			LANGFUSE_PUBLIC_KEY: 'pk-test',
			LANGFUSE_SECRET_KEY: 'sk-test',
			LANGFUSE_BASE_URL: 'https://langfuse.test',
			LANGFUSE_ENABLED: 'true',
			TELEGRAM_BOT_TOKEN: 'test_token',
			TELEGRAM_ALERT_CHAT_ID: '12345',
			EVAL_ADMIN_KEY: 'secret-admin-key',
			...overrides
		};
	}

	it('leases and processes passing jobs in drainEvalQueue', async () => {
		mockJobs.push({
			id: 'job-1',
			trace_id: 'tr-1',
			session_id: 'sess-1',
			user_id: 'u-1',
			priority: 'normal',
			status: 'pending',
			user_message: 'Berapa saldo kas siap pakai?',
			assistant_output: 'Saldo kas siap pakai Rp 1.500.000.',
			tool_results_json: null,
			trigger_reason: 'random_sample',
			attempts: 0,
			last_error: null,
			locked_at: null,
			created_at: Date.now(),
			processed_at: null
		});

		const env = createMockEnv();
		const summary = await drainEvalQueue(env, { batchSize: 5 });

		expect(summary.processed).toBe(1);
		expect(summary.failed).toBe(0);
		expect(summary.stagedCandidates).toBe(0);
		expect(mockJobs[0].status).toBe('completed');
	});

	it('stages candidate and triggers alert on judge failure', async () => {
		// Mock failing judge output
		mockFetch.mockImplementation((url: string) => {
			if (url.includes('/chat/completions')) {
				return Promise.resolve({
					ok: true,
					json: async () => ({
						choices: [
							{
								message: {
									content: JSON.stringify({
										evaluator: 'consolidated_judge',
										overallScore: 0.2,
										pass: false,
										reasoning: 'Assistant failed to defend locked reserves',
										financialSoundness: {
											score: 0.0,
											lockedCashDefended: false,
											deficitHandled: true,
											arithmeticConsistent: true,
											isApplicable: true,
											explanation: 'Allowed spending locked cash'
										},
										personaTone: {
											score: 0.8,
											zeroEmojis: true,
											currencyCompliant: true
										},
										toolTrajectory: {
											score: 1.0,
											toolSelectionAccurate: true,
											redundantCallsAvoided: true
										}
									})
								}
							}
						]
					})
				});
			}
			return Promise.resolve({
				ok: true,
				text: async () => 'ok',
				json: async () => ({ ok: true })
			});
		});

		mockJobs.push({
			id: 'job-fail',
			trace_id: 'tr-fail',
			session_id: 'sess-fail',
			user_id: 'u-fail',
			priority: 'high',
			status: 'pending',
			user_message: 'Tolong transfer dana darurat 081234567890',
			assistant_output: 'Baik, dana darurat sudah ditransfer.',
			tool_results_json: null,
			trigger_reason: 'code_eval_failure',
			attempts: 0,
			last_error: null,
			locked_at: null,
			created_at: Date.now(),
			processed_at: null
		});

		const env = createMockEnv();
		const summary = await drainEvalQueue(env, { batchSize: 5 });

		expect(summary.processed).toBe(1);
		expect(summary.failed).toBe(1);
		expect(summary.stagedCandidates).toBe(1);

		// Verify candidate staged with PII scrubbed
		expect(mockCandidates.length).toBe(1);
		expect(mockCandidates[0].sanitized_prompt).toContain('[REDACTED_PHONE]');
		expect(mockCandidates[0].sanitized_prompt).not.toContain('081234567890');
		expect(mockCandidates[0].judge_score).toBe(0.2);
	});

	it('guards POST /api/eval/drain-queue with EVAL_ADMIN_KEY', async () => {
		const env = createMockEnv({ EVAL_ADMIN_KEY: 'expected-secret' });

		// 1. Unauthorized when missing or wrong key
		const unauthRes = await evalRouter.request('/drain-queue', {
			method: 'POST',
			headers: {
				Authorization: 'Bearer wrong-key'
			}
		}, env);
		expect(unauthRes.status).toBe(401);

		// 2. Authorized when valid key provided
		const authRes = await evalRouter.request('/drain-queue', {
			method: 'POST',
			headers: {
				Authorization: 'Bearer expected-secret'
			}
		}, env);
		expect(authRes.status).toBe(200);
		const json = (await authRes.json()) as { success: boolean; processed: number };
		expect(json.success).toBe(true);
		expect(typeof json.processed).toBe('number');
	});

	it('leases up to 7 jobs with batchSize: 7 and caps subrequests under 50', async () => {
		for (let i = 1; i <= 10; i++) {
			mockJobs.push({
				id: `job-batch-${i}`,
				trace_id: `tr-batch-${i}`,
				session_id: `sess-batch-${i}`,
				user_id: `u-batch-${i}`,
				priority: 'normal',
				status: 'pending',
				user_message: `Berapa saldo dompet ${i}?`,
				assistant_output: `Saldo dompet ${i} Rp 1.000.000.`,
				tool_results_json: null,
				trigger_reason: 'random_sample',
				attempts: 0,
				last_error: null,
				locked_at: null,
				created_at: Date.now() + i,
				processed_at: null
			});
		}

		const env = createMockEnv();
		const summary = await drainEvalQueue(env, { batchSize: 7 });

		expect(summary.processed).toBe(7);
		expect(summary.failed).toBe(0);

		// Remaining jobs in queue should be exactly 3 pending
		const remainingPending = mockJobs.filter((j) => j.status === 'pending');
		expect(remainingPending.length).toBe(3);

		// Subrequests check: 1 Gemini + 4 Langfuse calls per job = 35 subrequests (strictly <= 42 and <= 50)
		const totalSubrequests = mockFetch.mock.calls.length;
		expect(totalSubrequests).toBeLessThanOrEqual(42);
		expect(totalSubrequests).toBe(35);
	});

	it('exits with zero cost and zero external subrequests when queue is empty', async () => {
		mockJobs = [];
		mockFetch.mockClear();

		const env = createMockEnv();
		const summary = await drainEvalQueue(env, { batchSize: 7 });

		expect(summary.processed).toBe(0);
		expect(summary.failed).toBe(0);
		expect(summary.stagedCandidates).toBe(0);
		expect(mockFetch.mock.calls.length).toBe(0);
	});
});
