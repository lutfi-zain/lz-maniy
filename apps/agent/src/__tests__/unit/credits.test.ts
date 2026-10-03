import { describe, it, expect, vi } from 'vitest';
import {
	calculateCreditsUsed,
	DEFAULT_CREDIT_BALANCE,
	CREDIT_VALUE_USD,
	FALLBACK_PRICING,
	getOrCreateUserCredits,
	deductCredits,
	getCreditPricing
} from '../../db/credits.js';

describe('Credit calculation logic', () => {
	it('uses correct default values', () => {
		expect(DEFAULT_CREDIT_BALANCE).toBe(2000);
		expect(CREDIT_VALUE_USD).toBe(0.0005);
		expect(FALLBACK_PRICING.inputPerMillion).toBe(0.75);
		expect(FALLBACK_PRICING.outputPerMillion).toBe(3.75);
	});

	it('calculates credits accurately for Gemini 3.1 Flash Lite', () => {
		const pricing = {
			model: 'google-antigravity/gemini-3.1-flash-lite',
			inputPerMillion: 0.25,
			outputPerMillion: 1.50
		};
		// 1500 input, 800 output
		// input: 1500 * 0.25 / 1M = 0.000375
		// output: 800 * 1.50 / 1M = 0.001200
		// total: 0.001575
		// credits: 0.001575 / 0.0005 = 3.15
		const credits = calculateCreditsUsed(1500, 800, pricing);
		expect(credits).toBe(3.15);
	});

	it('calculates credits accurately for Gemini 3.7 Flash', () => {
		const pricing = {
			model: 'google-antigravity/gemini-3.7-flash',
			inputPerMillion: 0.75,
			outputPerMillion: 3.75
		};
		// 1500 input, 800 output
		// input: 1500 * 0.75 / 1M = 0.001125
		// output: 800 * 3.75 / 1M = 0.003000
		// total: 0.004125
		// credits: 0.004125 / 0.0005 = 8.25
		const credits = calculateCreditsUsed(1500, 800, pricing);
		expect(credits).toBe(8.25);
	});

	it('calculates zero credits for zero tokens', () => {
		const credits = calculateCreditsUsed(0, 0, FALLBACK_PRICING);
		expect(credits).toBe(0);
	});
});

describe('D1 Database credit operations (mocked)', () => {
	it('creates new user credits with default 2000 balance when not existing', async () => {
		const mockFirst = vi.fn().mockResolvedValue(null);
		const mockRun = vi.fn().mockResolvedValue({ success: true });
		const mockBind = vi.fn().mockReturnValue({ first: mockFirst, run: mockRun });
		const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
		const mockDb = { prepare: mockPrepare } as unknown as D1Database;

		const result = await getOrCreateUserCredits(mockDb, 'user-123');
		expect(result.balance).toBe(2000);
		expect(result.lifetimeUsed).toBe(0);
		expect(result.defaultBalance).toBe(2000);
		expect(result.creditValueUsd).toBe(0.0005);
	});

	it('returns existing balance when found', async () => {
		const mockFirst = vi.fn().mockResolvedValue({ balance: 1450.5, lifetime_used: 549.5 });
		const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
		const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
		const mockDb = { prepare: mockPrepare } as unknown as D1Database;

		const result = await getOrCreateUserCredits(mockDb, 'user-123');
		expect(result.balance).toBe(1450.5);
		expect(result.lifetimeUsed).toBe(549.5);
	});

	it('deducts credits atomically and returns updated balance', async () => {
		const mockFirst = vi.fn().mockResolvedValue({ balance: 991.75 });
		const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
		const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
		const mockDb = { prepare: mockPrepare } as unknown as D1Database;

		const remaining = await deductCredits(mockDb, 'user-123', 8.25);
		expect(remaining).toBe(991.75);
	});

	it('falls back to default pricing when model row not found', async () => {
		const mockFirst = vi.fn().mockResolvedValue(null);
		const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
		const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
		const mockDb = { prepare: mockPrepare } as unknown as D1Database;

		const pricing = await getCreditPricing(mockDb, 'unknown-model');
		expect(pricing.inputPerMillion).toBe(FALLBACK_PRICING.inputPerMillion);
		expect(pricing.outputPerMillion).toBe(FALLBACK_PRICING.outputPerMillion);
	});
});
