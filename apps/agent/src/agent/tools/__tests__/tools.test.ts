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

	it('creates wallet tools and executes list_wallets', async () => {
		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify([{ walletId: 'w-1', walletName: 'BCA' }]), { status: 200 }));
		const tools = createWalletTools(baseUrl, token, mockFetcher);
		expect(tools.list_wallets).toBeDefined();
		expect(tools.create_wallet).toBeDefined();
		expect(tools.update_wallet).toBeDefined();
		expect(tools.delete_wallet).toBeDefined();

		const res = await tools.list_wallets.execute({}, { toolCallId: '1', messages: [] });
		expect(res).toEqual([{ walletId: 'w-1', walletName: 'BCA' }]);
		expect(mockFetch).toHaveBeenCalledWith(expect.objectContaining({
			url: 'https://mock.api/api/v1/wallets'
		}));
	});

	it('creates budget tools and executes list_budgets', async () => {
		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify([{ budgetId: 'b-1', amount: 1000000 }]), { status: 200 }));
		const tools = createBudgetTools(baseUrl, token, mockFetcher);
		expect(tools.list_budgets).toBeDefined();
		expect(tools.create_budget).toBeDefined();

		const res = await tools.list_budgets.execute({}, { toolCallId: '1', messages: [] });
		expect(res).toEqual([{ budgetId: 'b-1', amount: 1000000 }]);
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

	it('creates goal tools and link/unlink', async () => {
		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify([{ goalId: 'g-1', name: 'Sewa Rumah' }]), { status: 200 }));
		const tools = createGoalTools(baseUrl, token, mockFetcher);
		expect(tools.list_goals).toBeDefined();
		expect(tools.create_goal).toBeDefined();
		expect(tools.link_goal_wallet).toBeDefined();
		expect(tools.unlink_goal_wallet).toBeDefined();

		const res = await tools.list_goals.execute({}, { toolCallId: '1', messages: [] });
		expect(res).toEqual([{ goalId: 'g-1', name: 'Sewa Rumah' }]);
	});

	it('creates recurring tools and apply', async () => {
		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify([{ templateId: 'r-1', name: 'Cicilan' }]), { status: 200 }));
		const tools = createRecurringTools(baseUrl, token, mockFetcher);
		expect(tools.list_recurring).toBeDefined();
		expect(tools.apply_recurring).toBeDefined();

		const res = await tools.list_recurring.execute({}, { toolCallId: '1', messages: [] });
		expect(res).toEqual([{ templateId: 'r-1', name: 'Cicilan' }]);
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
	});
});
