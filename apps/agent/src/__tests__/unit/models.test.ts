import { describe, it, expect } from 'vitest';
import { AVAILABLE_MODELS } from '../../agent/models.js';

describe('AVAILABLE_MODELS', () => {
	it('includes working models', () => {
		expect(AVAILABLE_MODELS.length).toBeGreaterThan(0);
	});

	it('all models have tool_calling enabled', () => {
		for (const m of AVAILABLE_MODELS) {
			expect(m.capabilities.tool_calling).toBe(true);
		}
	});
});
