import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { syncLangfuseExperimentRuns } from '../../../eval/observability-sync.js';

describe('Benchmark Experiment Runs Sync (Langfuse Dataset Runs)', () => {
	let mockFetch: Mock;

	beforeEach(() => {
		mockFetch = vi.fn();
		globalThis.fetch = mockFetch as unknown as typeof fetch;
	});

	it('posts dataset run items and attaches assertion scores', async () => {
		const postedRunItems: Array<Record<string, unknown>> = [];
		const postedScores: Array<Record<string, unknown>> = [];

		mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
			if (url.includes('/api/public/dataset-run-items') && init?.method === 'POST') {
				const body = JSON.parse(init.body as string);
				postedRunItems.push(body);
				return { ok: true, status: 200, json: async () => ({ id: `run_item_${postedRunItems.length}` }) };
			}
			if (url.includes('/api/public/scores') && init?.method === 'POST') {
				const body = JSON.parse(init.body as string);
				postedScores.push(body);
				return { ok: true, status: 200, json: async () => ({ id: `score_${postedScores.length}` }) };
			}
			return { ok: true, status: 200, json: async () => ({}) };
		});

		const count = await syncLangfuseExperimentRuns('https://langfuse.test', 'Basic dGVzdA==');

		expect(count).toBeGreaterThan(0);
		expect(postedRunItems.length).toBeGreaterThan(0);
		expect(postedScores.length).toBeGreaterThan(0);

		const firstRun = postedRunItems[0];
		expect(firstRun.datasetItemId).toBeDefined();
		expect(firstRun.runName).toMatch(/^exp-/);
		expect(firstRun.traceId).toBeDefined();

		const firstScore = postedScores[0];
		expect(firstScore.name).toBe('financial_grounding_judge');
		expect(firstScore.dataType).toBe('CATEGORICAL');
		expect(firstScore.value).toBe('grounded');
		expect(firstScore.traceId).toBe(firstRun.traceId);
	});

	it('handles network failures gracefully without terminating whole batch', async () => {
		mockFetch.mockRejectedValue(new Error('Network error on run item'));

		const count = await syncLangfuseExperimentRuns('https://langfuse.test', 'Basic dGVzdA==');
		expect(count).toBe(0);
	});
});
