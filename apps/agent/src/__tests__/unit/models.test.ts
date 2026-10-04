import { describe, it, expect } from 'vitest';
import { AVAILABLE_MODELS } from '../../agent/models.js';

describe('AVAILABLE_MODELS', () => {
	it('includes OMP gateway models', () => {
		expect(AVAILABLE_MODELS.length).toBe(12);
		const providers = AVAILABLE_MODELS.map((m) => m.provider);
		expect(providers).toContain('omp');
		const models = AVAILABLE_MODELS.map((m) => m.model);
		expect(models).toContain('google-antigravity/gemini-3.1-flash-lite');
		expect(models).toContain('google-antigravity/gemini-3.7-flash');
		expect(models).toContain('google-antigravity/gemini-2.5-pro');
	});

	it('all models have tool_calling enabled', () => {
		for (const m of AVAILABLE_MODELS) {
			expect(m.capabilities.tool_calling).toBe(true);
		}
	});
});
