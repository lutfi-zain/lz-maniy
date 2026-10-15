import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import {
	CANONICAL_SCORE_CONFIGS,
	syncLangfuseScoreConfigs,
	CANONICAL_MODELS,
	syncLangfuseModelPricing,
	syncLangfuseExperimentRuns
} from '../../../eval/observability-sync.js';

describe('Observability Sync Unit Tests', () => {
	let mockFetch: Mock;

	beforeEach(() => {
		mockFetch = vi.fn();
		globalThis.fetch = mockFetch as unknown as typeof fetch;
	});

	describe('CANONICAL_SCORE_CONFIGS', () => {
		it('defines all 9 required canonical score configs', () => {
			expect(CANONICAL_SCORE_CONFIGS.length).toBe(9);
			const names = CANONICAL_SCORE_CONFIGS.map((c) => c.name);
			expect(names).toContain('financial_grounding_judge');
			expect(names).toContain('advisory_rubric_judge');
			expect(names).toContain('multi_intent_completeness');
			expect(names).toContain('idr_currency_compliance');
			expect(names).toContain('tool_dispatch_accuracy');
			expect(names).toContain('credit_settlement_audit');
			expect(names).toContain('human_audit_review');
			expect(names).toContain('user_feedback');
			expect(names).toContain('latency_ms');
		});

		it('properly configures categorical values for financial_grounding_judge', () => {
			const cfg = CANONICAL_SCORE_CONFIGS.find((c) => c.name === 'financial_grounding_judge');
			expect(cfg?.dataType).toBe('CATEGORICAL');
			expect(cfg?.categories).toEqual([
				{ label: 'grounded', value: 1.0 },
				{ label: 'hallucinated', value: 0.0 }
			]);
		});

		it('properly configures numeric boundaries for latency_ms', () => {
			const cfg = CANONICAL_SCORE_CONFIGS.find((c) => c.name === 'latency_ms');
			expect(cfg?.dataType).toBe('NUMERIC');
			expect(cfg?.minValue).toBe(0);
			expect(cfg?.maxValue).toBe(60000);
		});
	});

	describe('syncLangfuseScoreConfigs', () => {
		it('fetches existing configs and creates missing ones', async () => {
			// First call to GET /api/public/score-configs returns empty list
			mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
				if (url.includes('/api/public/score-configs') && (!init || init.method === 'GET' || !init.method)) {
					return {
						ok: true,
						json: async () => ({ data: [{ id: 'cfg_existing', name: 'financial_grounding_judge' }] })
					};
				}
				if (url.includes('/api/public/score-configs') && init?.method === 'POST') {
					const body = JSON.parse(init.body as string);
					return {
						ok: true,
						json: async () => ({ id: `cfg_${body.name}` })
					};
				}
				return { ok: false, status: 404, text: async () => 'not found' };
			});

			const configMap = await syncLangfuseScoreConfigs('https://langfuse.test', 'Basic dGVzdA==');

			expect(configMap['financial_grounding_judge']).toBe('cfg_existing');
			expect(configMap['advisory_rubric_judge']).toBe('cfg_advisory_rubric_judge');
			expect(configMap['user_feedback']).toBe('cfg_user_feedback');
			expect(Object.keys(configMap).length).toBe(9);
		});

		it('gracefully handles 409 conflict and error responses', async () => {
			mockFetch.mockImplementation(async (_url: string, init?: RequestInit) => {
				if (init?.method === 'POST') {
					return {
						ok: false,
						status: 409,
						text: async () => 'Config already exists'
					};
				}
				return {
					ok: true,
					json: async () => ({ data: [] })
				};
			});

			const configMap = await syncLangfuseScoreConfigs('https://langfuse.test', 'Basic dGVzdA==');
			expect(configMap).toBeDefined();
		});
	});

	describe('syncLangfuseModelPricing', () => {
		it('registers custom OMP gateway models with non-zero pricing', async () => {
			mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
				if (url.includes('/api/public/models') && (!init || init.method === 'GET' || !init.method)) {
					return {
						ok: true,
						json: async () => ({ data: [] })
					};
				}
				if (url.includes('/api/public/models') && init?.method === 'POST') {
					return {
						ok: true,
						json: async () => ({ success: true })
					};
				}
				return { ok: true, json: async () => ({}) };
			});

			const count = await syncLangfuseModelPricing('https://langfuse.test', 'Basic dGVzdA==');
			expect(count).toBe(CANONICAL_MODELS.length);
		});
	});

	describe('syncLangfuseExperimentRuns', () => {
		it('posts dataset run items and attaches scores', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({ success: true }),
				text: async () => 'ok'
			});

			const runs = await syncLangfuseExperimentRuns('https://langfuse.test', 'Basic dGVzdA==');
			expect(runs).toBeGreaterThan(0);
		});
	});
});
