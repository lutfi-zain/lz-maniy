import { describe, it, expect } from 'vitest';
import { AVAILABLE_MODELS } from '../../agent/models.js';

describe('AVAILABLE_MODELS', () => {
	it('includes Gemini and Groq models', () => {
		expect(AVAILABLE_MODELS.length).toBeGreaterThan(1);
		const providers = AVAILABLE_MODELS.map(m => m.provider);
		expect(providers).toContain('gemini');
		expect(providers).toContain('groq');
	});

	it('all models have tool_calling enabled', () => {
		for (const m of AVAILABLE_MODELS) {
			expect(m.capabilities.tool_calling).toBe(true);
		}
	});
});
