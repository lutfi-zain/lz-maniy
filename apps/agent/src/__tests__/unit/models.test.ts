import { describe, it, expect } from 'vitest';
import { AVAILABLE_MODELS } from '../../agent/models.js';

describe('AVAILABLE_MODELS', () => {
	it('includes both Gemini and Groq models', () => {
		const providers = new Set(AVAILABLE_MODELS.map((m) => m.provider));
		expect(providers.has('gemini')).toBe(true);
		expect(providers.has('groq')).toBe(true);
	});

	it('has vision capability flagged correctly', () => {
		const geminiFlash = AVAILABLE_MODELS.find((m) => m.model === 'gemini-3.8-flash');
		const groqModel = AVAILABLE_MODELS.find((m) => m.model === 'qwen/qwen3.8-27b');
		expect(geminiFlash?.capabilities.vision).toBe(true);
		expect(groqModel?.capabilities.vision).toBe(false);
	});

	it('all models have tool_calling enabled', () => {
		for (const m of AVAILABLE_MODELS) {
			expect(m.capabilities.tool_calling).toBe(true);
		}
	});
});
