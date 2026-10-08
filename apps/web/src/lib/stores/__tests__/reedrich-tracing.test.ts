import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { generateReedrichTraceParent, ReedrichStore } from '../reedrich.svelte.js';

describe('Dashboard REST Store W3C Traceparent Propagation', () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it('generates valid W3C traceparent strings via generateReedrichTraceParent', () => {
		const tp1 = generateReedrichTraceParent();
		const tp2 = generateReedrichTraceParent();

		expect(tp1).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
		expect(tp2).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
		expect(tp1).not.toBe(tp2);
	});

	it('attaches W3C traceparent header on ReedrichStore read (fetchWallets) and write (createTransaction) requests', async () => {
		const capturedTraceParents: string[] = [];

		globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
			const headers = new Headers(init?.headers);
			const tp = headers.get('traceparent');
			if (tp) capturedTraceParents.push(tp);
			return new Response(JSON.stringify({ items: [], id: 'tx_1' }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		}) as unknown as typeof fetch;

		const store = new ReedrichStore(false);
		store.apiToken = 'test_session_tok';

		await store.fetchWallets({ startDate: '2026-10-01', endDate: '2026-10-31' });
		await store.createTransaction({
			walletId: 'wal_1',
			categoryId: 'cat_1',
			amount: 85000,
			type: 'expense',
			date: '2026-10-08',
			description: 'Waroeng Steak'
		});

		expect(capturedTraceParents.length).toBeGreaterThanOrEqual(2);
		for (const tp of capturedTraceParents) {
			expect(tp).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
		}
	});
});
