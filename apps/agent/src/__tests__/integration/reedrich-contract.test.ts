import { describe, it, expect } from 'vitest';
import { createFinancialTools } from '../../agent/tools/financial.js';

interface RequestValidationResult {
	isValid: boolean;
	error?: string;
}

/**
 * Contract validator mirroring ReedRich MCP route schemas
 */
function validateReedrichRequest(urlStr: string): RequestValidationResult {
	const url = new URL(urlStr);
	const pathname = url.pathname;
	const params = url.searchParams;

	if (pathname === '/api/v1/transactions') {
		const orderBy = params.get('orderBy');
		const validOrderBy = ['date', 'amount', 'createdAt', 'description'];
		if (orderBy && !validOrderBy.includes(orderBy)) {
			return {
				isValid: false,
				error: `Validation Error: 'orderBy' must be one of ${validOrderBy.join(', ')}`
			};
		}

		const direction = params.get('direction');
		if (direction && direction !== 'asc' && direction !== 'desc') {
			return {
				isValid: false,
				error: "Validation Error: 'direction' must be either 'asc' or 'desc'"
			};
		}

		const startDate = params.get('startDate');
		if (startDate && !/^\d{4}-\d{2}-\d{2}/.test(startDate)) {
			return {
				isValid: false,
				error: "Validation Error: 'startDate' must be a valid ISO date or timestamp"
			};
		}

		const endDate = params.get('endDate');
		if (endDate && !/^\d{4}-\d{2}-\d{2}/.test(endDate)) {
			return {
				isValid: false,
				error: "Validation Error: 'endDate' must be a valid ISO date or timestamp"
			};
		}

		const type = params.get('type');
		if (type && !['expense', 'income', 'transfer'].includes(type)) {
			return {
				isValid: false,
				error: "Validation Error: 'type' must be 'expense', 'income', or 'transfer'"
			};
		}

		const status = params.get('status');
		if (status && !['realized', 'planned', 'all'].includes(status)) {
			return {
				isValid: false,
				error: "Validation Error: 'status' must be 'realized', 'planned', or 'all'"
			};
		}
	}

	if (pathname === '/api/v1/analytics/horizon') {
		const months = params.get('months');
		if (months) {
			const m = Number(months);
			if (isNaN(m) || m < 1 || m > 24) {
				return {
					isValid: false,
					error: "Validation Error: 'months' must be an integer between 1 and 24"
				};
			}
		}

		const filter = params.get('filter');
		if (filter && !['realized', 'planned', 'all'].includes(filter)) {
			return {
				isValid: false,
				error: "Validation Error: 'filter' must be 'realized', 'planned', or 'all'"
			};
		}
	}

	return { isValid: true };
}

describe('ReedRich Contract-Driven Parameter Integration', () => {
	const capturedUrls: string[] = [];

	const contractEnforcingFetcher = {
		fetch: async (req: Request | string) => {
			const urlStr = typeof req === 'string' ? req : req.url;
			capturedUrls.push(urlStr);

			const validation = validateReedrichRequest(urlStr);
			if (!validation.isValid) {
				return new Response(JSON.stringify({ error: validation.error }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				});
			}

			// Valid response mock matching endpoint contracts
			if (urlStr.includes('/api/v1/transactions')) {
				return new Response(JSON.stringify([]), { status: 200 });
			}
			if (urlStr.includes('/api/v1/analytics/horizon')) {
				return new Response(JSON.stringify({ baseCurrency: 'IDR', periods: [] }), { status: 200 });
			}
			if (urlStr.includes('/api/v1/summary')) {
				return new Response(JSON.stringify({ safeToSpend: 1000000 }), { status: 200 });
			}
			return new Response(JSON.stringify({}), { status: 200 });
		}
	} as unknown as Fetcher;

	const tools = createFinancialTools('https://reedrich.internal', 'test-token', contractEnforcingFetcher);

	it('validates list_transactions with compound orderBy maps to compliant params', async () => {
		const res = await tools.list_transactions.execute(
			{
				orderBy: 'date_desc',
				startDate: '2026-10',
				type: 'expense',
				status: 'realized',
				limit: 20
			},
			{ toolCallId: '1', messages: [] }
		);

		expect(Array.isArray(res)).toBe(true);
		const lastUrl = capturedUrls.at(-1)!;
		const validation = validateReedrichRequest(lastUrl);
		expect(validation.isValid).toBe(true);
		expect(lastUrl).toContain('orderBy=date');
		expect(lastUrl).toContain('direction=desc');
		expect(lastUrl).toContain('startDate=2026-10-01');
	});

	it('validates horizon_projection adheres to parameter limits', async () => {
		const res = await tools.horizon_projection.execute(
			{
				months: 14,
				filter: 'all',
				baseCurrency: 'IDR'
			},
			{ toolCallId: '2', messages: [] }
		);

		expect(res.periods).toBeDefined();
		const lastUrl = capturedUrls.at(-1)!;
		const validation = validateReedrichRequest(lastUrl);
		expect(validation.isValid).toBe(true);
		expect(lastUrl).toContain('months=14');
		expect(lastUrl).toContain('filter=all');
	});

	it('proves contract validator catches and rejects unmapped invalid params', () => {
		const badOrderBy = validateReedrichRequest('https://reedrich.internal/api/v1/transactions?orderBy=date_desc');
		expect(badOrderBy.isValid).toBe(false);
		expect(badOrderBy.error).toContain("Validation Error: 'orderBy' must be one of");

		const badDirection = validateReedrichRequest('https://reedrich.internal/api/v1/transactions?orderBy=date&direction=down');
		expect(badDirection.isValid).toBe(false);
		expect(badDirection.error).toContain("Validation Error: 'direction' must be either 'asc' or 'desc'");

		const badHorizonMonths = validateReedrichRequest('https://reedrich.internal/api/v1/analytics/horizon?months=36');
		expect(badHorizonMonths.isValid).toBe(false);
		expect(badHorizonMonths.error).toContain("Validation Error: 'months' must be an integer between 1 and 24");
	});
});
