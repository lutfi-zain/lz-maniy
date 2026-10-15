/// <reference types="@cloudflare/workers-types" />
import { describe, it, expect, vi } from 'vitest';
import { createWalletTools } from '../wallet-management.js';
import { createBudgetTools } from '../budget-management.js';
import { createDebtLoanTools } from '../debt-loan.js';
import { createGoalTools } from '../goal-management.js';
import { createRecurringTools } from '../recurring.js';
import { createFeedbackTools } from '../feedback.js';
import { createFinancialTools } from '../financial.js';
import { createMutationTools } from '../mutations.js';

describe('Reedrich Tool Factories', () => {
	const mockFetch = vi.fn();
	const mockFetcher = { fetch: mockFetch } as unknown as Fetcher;
	const baseUrl = 'https://mock.api';
	const token = 'test-token';

	it('creates wallet tools and executes list_wallets and get_wallet', async () => {
		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify([{ walletId: 'w-1', walletName: 'BCA' }]), { status: 200 }));
		const tools = createWalletTools(baseUrl, token, mockFetcher);
		expect(tools.list_wallets).toBeDefined();
		expect(tools.get_wallet).toBeDefined();
		expect(tools.create_wallet).toBeDefined();
		expect(tools.update_wallet).toBeDefined();
		expect(tools.delete_wallet).toBeDefined();

		const res = await tools.list_wallets.execute({}, { toolCallId: '1', messages: [] });
		expect(res).toEqual([{ walletId: 'w-1', walletName: 'BCA' }]);
		expect(mockFetch).toHaveBeenCalledWith(expect.objectContaining({
			url: 'https://mock.api/api/v1/wallets'
		}));

		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ walletId: 'w-1', name: 'BCA Main' }), { status: 200 }));
		const singleWallet = await tools.get_wallet.execute({ walletId: 'w-1' }, { toolCallId: '1', messages: [] });
		expect(singleWallet).toEqual({ walletId: 'w-1', name: 'BCA Main' });
	});

	it('creates budget tools and executes list_budgets and get_budget', async () => {
		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify([{ budgetId: 'b-1', amount: 1000000 }]), { status: 200 }));
		const tools = createBudgetTools(baseUrl, token, mockFetcher);
		expect(tools.list_budgets).toBeDefined();
		expect(tools.get_budget).toBeDefined();
		expect(tools.create_budget).toBeDefined();
		expect(tools.update_budget).toBeDefined();

		const res = await tools.list_budgets.execute({}, { toolCallId: '1', messages: [] });
		expect(res).toEqual([{ budgetId: 'b-1', amount: 1000000 }]);

		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ budgetId: 'b-1', name: 'Makan' }), { status: 200 }));
		const singleBudget = await tools.get_budget.execute({ budgetId: 'b-1' }, { toolCallId: '1', messages: [] });
		expect(singleBudget).toEqual({ budgetId: 'b-1', name: 'Makan' });
	});

	it('creates debt-loan tools', async () => {
		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify([{ debtLoanId: 'd-1', amount: 500000 }]), { status: 200 }));
		const tools = createDebtLoanTools(baseUrl, token, mockFetcher);
		expect(tools.list_debts_loans).toBeDefined();
		expect(tools.create_debt_loan).toBeDefined();
		expect(tools.repay_debt_loan).toBeDefined();

		const res = await tools.list_debts_loans.execute({}, { toolCallId: '1', messages: [] });
		expect(res).toEqual([{ debtLoanId: 'd-1', amount: 500000 }]);
	});

	it('creates goal tools and link/unlink and get_goal', async () => {
		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify([{ goalId: 'g-1', name: 'Sewa Rumah' }]), { status: 200 }));
		const tools = createGoalTools(baseUrl, token, mockFetcher);
		expect(tools.list_goals).toBeDefined();
		expect(tools.get_goal).toBeDefined();
		expect(tools.create_goal).toBeDefined();
		expect(tools.link_goal_wallet).toBeDefined();
		expect(tools.unlink_goal_wallet).toBeDefined();

		const res = await tools.list_goals.execute({}, { toolCallId: '1', messages: [] });
		expect(res).toEqual([{ goalId: 'g-1', name: 'Sewa Rumah' }]);

		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ goalId: 'g-1', name: 'Sewa Rumah 2026' }), { status: 200 }));
		const singleGoal = await tools.get_goal.execute({ goalId: 'g-1' }, { toolCallId: '1', messages: [] });
		expect(singleGoal).toEqual({ goalId: 'g-1', name: 'Sewa Rumah 2026' });
	});

	it('creates recurring tools and apply and get_recurring', async () => {
		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify([{ templateId: 'r-1', name: 'Cicilan' }]), { status: 200 }));
		const tools = createRecurringTools(baseUrl, token, mockFetcher);
		expect(tools.list_recurring).toBeDefined();
		expect(tools.get_recurring).toBeDefined();
		expect(tools.apply_recurring).toBeDefined();

		const res = await tools.list_recurring.execute({}, { toolCallId: '1', messages: [] });
		expect(res).toEqual([{ templateId: 'r-1', name: 'Cicilan' }]);

		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ templateId: 'r-1', name: 'Cicilan Motor' }), { status: 200 }));
		const singleRec = await tools.get_recurring.execute({ templateId: 'r-1' }, { toolCallId: '1', messages: [] });
		expect(singleRec).toEqual({ templateId: 'r-1', name: 'Cicilan Motor' });

		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Applied' }), { status: 200 }));
		const applyRes = await tools.apply_recurring.execute({
			templateId: 'r-1',
			actualAmount: 500000,
			executionDate: '2026-10-03T10:00:00+07:00'
		}, { toolCallId: '1', messages: [] });
		expect(applyRes).toEqual({ message: 'Applied' });
	});

	it('creates feedback tools', async () => {
		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ status: 'received' }), { status: 200 }));
		const tools = createFeedbackTools(baseUrl, token, mockFetcher);
		expect(tools.submit_feedback).toBeDefined();

		const res = await tools.submit_feedback.execute({ title: 'Feature idea', content: 'Add more charts to cockpit', type: 'feedback' }, { toolCallId: '1', messages: [] });
		expect(res).toEqual({ status: 'received' });
	});

	it('creates extended financial tools with financial_summary and horizon', async () => {
		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ safeToSpend: 4500000 }), { status: 200 }));
		const tools = createFinancialTools(baseUrl, token, mockFetcher);
		expect(tools.financial_summary).toBeDefined();
		expect(tools.horizon_projection).toBeDefined();
		expect(tools.create_category).toBeDefined();
		expect(tools.update_profile).toBeDefined();

		const res = await tools.financial_summary.execute({ baseCurrency: 'IDR' }, { toolCallId: '1', messages: [] });
		expect(res).toEqual({ safeToSpend: 4500000 });

		// Test horizon_projection compact trajectory DTO and payload budget (<3KB)
		const mockPeriods = Array.from({ length: 14 }, (_, i) => ({
			periodKey: `2027-${String(i + 1).padStart(2, '0')}`,
			startDate: `2027-${String(i + 1).padStart(2, '0')}-01T00:00:00Z`,
			endDate: `2027-${String(i + 1).padStart(2, '0')}-28T23:59:59Z`,
			cashflow: { income: 20000000, expense: 15000000, net: 5000000, netSpendable: 3000000, netLocked: 2000000 },
			netWorth: { total: 50000000 + i * 5000000, spendable: 20000000 + i * 3000000, locked: 30000000 + i * 2000000 },
			walletBalances: Array.from({ length: 8 }, (_, w) => ({ walletId: `w-${w}`, balance: 5000000 })),
			goals: [{ goalName: 'DP Mobil', targetAmount: 50000000, currentAmount: 30000000 + i * 3000000, milestoneStatus: i >= 10 ? 'reached' : 'in_progress' }]
		}));

		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
			baseCurrency: 'IDR',
			startingNetWorth: { total: 50000000, spendable: 20000000, locked: 30000000 },
			periods: mockPeriods
		}), { status: 200 }));

		interface CompactHorizonResult {
			baseCurrency: string;
			startingNetWorth: { total: number; spendable: number; locked: number };
			periods: Array<{
				month: string;
				income: number;
				expense: number;
				netSpendable: number;
				spendableNetWorth: number;
				totalNetWorth: number;
				milestones?: Array<{ name: string; target: number }>;
				walletBalances?: unknown;
			}>;
		}

		const horizonRes = (await tools.horizon_projection.execute({ months: 14, filter: 'all', baseCurrency: 'IDR' }, { toolCallId: '1', messages: [] })) as unknown as CompactHorizonResult;
		expect(horizonRes.periods).toHaveLength(14);
		expect(horizonRes.periods[0].month).toBe('2027-01');
		expect(horizonRes.periods[0].spendableNetWorth).toBe(20000000);
		expect(horizonRes.periods[10].milestones).toEqual([{ name: 'DP Mobil', target: 50000000 }]);
		expect(horizonRes.periods[0].walletBalances).toBeUndefined(); // Raw wallet array omitted

		const serializedSize = JSON.stringify(horizonRes).length;
		expect(serializedSize).toBeLessThan(3072); // Under 3KB budget
	});

	it('creates mutation tools with full ISO-8601 date, budgetId, and categoryId', async () => {
		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ transactionId: 't-1', amount: 50000 }), { status: 200 }));
		const tools = createMutationTools(baseUrl, token, mockFetcher);
		expect(tools.create_transaction).toBeDefined();
		expect(tools.update_transaction).toBeDefined();
		expect(tools.create_transfer).toBeDefined();
		expect(tools.delete_transaction).toBeDefined();

		const created = await tools.create_transaction.execute({
			walletId: 'w-1',
			categoryId: 'c-1',
			amount: 50000,
			type: 'expense',
			adminFee: 0,
			isPlanned: false,
			budgetId: 'b-1',
			date: '2026-10-03T13:45:00+07:00'
		}, { toolCallId: '1', messages: [] });
		expect(created).toEqual({ transactionId: 't-1', amount: 50000 });

		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ transactionId: 't-1', amount: 55000 }), { status: 200 }));
		const updated = await tools.update_transaction.execute({
			transactionId: 't-1',
			amount: 55000,
			budgetId: 'b-1',
			date: '2026-10-03T14:00:00+07:00'
		}, { toolCallId: '1', messages: [] });
		expect(updated).toEqual({ transactionId: 't-1', amount: 55000 });

		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ transferId: 'tf-1' }), { status: 200 }));
		const transfer = await tools.create_transfer.execute({
			sourceWalletId: 'w-1',
			targetWalletId: 'w-2',
			amount: 100000,
			adminFee: 0,
			categoryId: 'c-transfer',
			date: '2026-10-03T14:15:00+07:00'
		}, { toolCallId: '1', messages: [] });
		expect(transfer).toEqual({ transferId: 'tf-1' });
	});

	it('list_transactions returns id, full date-time, and supports search/filter parameters', async () => {
		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
			items: [
				{
					transactionId: 'tx-123',
					transactionDate: '2026-10-03T13:45:00+07:00',
					transactionAmount: 75000,
					transactionWalletId: 'w-1',
					transactionTargetWalletId: null,
					transactionCategoryId: 'cat-lunch',
					transactionBudgetId: 'b-food',
					transactionType: 'expense',
					transactionIsPlanned: 0,
					transactionDescription: 'Makan siang ayam geprek'
				}
			]
		}), { status: 200 }));

		const tools = createFinancialTools(baseUrl, token, mockFetcher);
		const listRes = await tools.list_transactions.execute({
			q: 'ayam',
			type: 'expense',
			isPlanned: false,
			budgetId: 'b-food',
			limit: 50
		}, { toolCallId: '1', messages: [] });

		expect(listRes).toHaveLength(1);
		expect(listRes[0]).toEqual({
			id: 'tx-123',
			date: '2026-10-03T13:45:00+07:00',
			amount: 75000,
			adminFee: undefined,
			walletId: 'w-1',
			targetWalletId: undefined,
			categoryId: 'cat-lunch',
			budgetId: 'b-food',
			type: 'expense',
			isPlanned: false,
			desc: 'Makan siang ayam geprek'
		});

		// Test get_transaction drilldown
		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
			transactionId: 'tx-123',
			transactionAmount: 75000
		}), { status: 200 }));

		const singleTx = await tools.get_transaction.execute({ transactionId: 'tx-123' }, { toolCallId: '1', messages: [] });
		expect(singleTx).toEqual({ transactionId: 'tx-123', transactionAmount: 75000 });
	});

	it('list_transactions maps compound orderBy and handles non-200 responses gracefully', async () => {
		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));
		const tools = createFinancialTools(baseUrl, token, mockFetcher);

		await tools.list_transactions.execute({
			orderBy: 'date_desc',
			startDate: '2026-10'
		}, { toolCallId: '2', messages: [] });

		const lastCall = mockFetch.mock.calls.at(-1);
		const rawTarget = lastCall?.[0];
		const url = rawTarget instanceof Request ? rawTarget.url : String(rawTarget || '');
		expect(url).toContain('orderBy=date');
		expect(url).toContain('direction=desc');
		expect(url).toContain('startDate=2026-10-01');

		// Non-200 graceful fallback
		mockFetch.mockResolvedValueOnce(new Response('Validation Error', { status: 400 }));
		const fallbackRes = await tools.list_transactions.execute({
			q: 'invalid'
		}, { toolCallId: '3', messages: [] });
		expect(fallbackRes).toEqual([]);
	});
});
