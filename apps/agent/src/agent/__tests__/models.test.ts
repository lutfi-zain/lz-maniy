import { describe, it, expect } from 'vitest';
import { getModel, AVAILABLE_MODELS } from '../models.js';
import type { Env } from '../../types.js';

describe('models', () => {
	it('has exactly 4 curated OMP models in AVAILABLE_MODELS', () => {
		expect(AVAILABLE_MODELS.length).toBe(4);
		const ids = AVAILABLE_MODELS.map((m) => m.model);
		expect(ids).toEqual([
			'google-antigravity/gemini-3.1-flash-lite',
			'google-antigravity/gemini-3.7-flash',
			'google-antigravity/gemini-3.8-flash',
			'opencode-zen/muse-spark-1.3-contributor-free'
		]);
	});

	it('instantiates omp provider model without errors', () => {
		const mockEnv: Env = {
			DB: {} as unknown as D1Database,
			CONFIG: {} as unknown as KVNamespace,
			REEDRICH_API_URL: 'https://test',
			GEMINI_API_KEY: 'test',
			GROQ_API_KEY: 'test',
			OMP_GATEWAY_KEY: 'test-omp-key',
			OMP_GATEWAY_URL: 'https://ai.membran.app/v1'
		};

		const model = getModel(mockEnv, 'omp', 'google-antigravity/gemini-3.7-flash');
		expect(model).toBeDefined();
		expect(model.modelId).toBe('google-antigravity/gemini-3.7-flash');
	});
});
