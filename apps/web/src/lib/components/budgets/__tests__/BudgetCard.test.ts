import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'svelte/server';
import BudgetCard from '../BudgetCard.svelte';
import { i18nStore } from '$lib/i18n/index.svelte';
import type { BudgetSnapshot } from '$lib/types/account-detail';

describe('BudgetCard Component', () => {
	beforeEach(() => {
		i18nStore.setLocale('en');
	});

	const safeBudget: BudgetSnapshot = {
		budgetId: 'bgt-food',
		budgetName: 'Groceries & Dining',
		categoryName: 'Food & Beverage',
		amount: 5000000,
		spent: 3700000,
		remaining: 1300000,
		percentUsed: 74,
		status: 'on_track'
	};

	const warningBudget: BudgetSnapshot = {
		budgetId: 'bgt-gas',
		budgetName: 'Fuel & Commute',
		categoryName: 'Transport',
		amount: 1000000,
		spent: 850000,
		remaining: 150000,
		percentUsed: 85,
		status: 'warning'
	};

	const overBudget: BudgetSnapshot = {
		budgetId: 'bgt-shopping',
		budgetName: 'Electronics & Gadgets',
		categoryName: 'Shopping',
		amount: 5000000,
		spent: 5750000,
		remaining: -750000,
		percentUsed: 115,
		status: 'over_budget'
	};

	it('renders safe budget values and progress bar width correctly', () => {
		const result = render(BudgetCard, {
			props: { budget: safeBudget }
		});

		expect(result.body).toContain('74%');
		expect(result.body).toContain('1,300,000');
		expect(result.body).toContain('3,700,000');
		expect(result.body).toContain('5,000,000');
		expect(result.body).toContain('width: 74%');
	});

	it('renders warning budget (>=80%) with warning status and calculated remaining', () => {
		const result = render(BudgetCard, {
			props: { budget: warningBudget }
		});

		expect(result.body).toContain('85%');
		expect(result.body).toContain('150,000');
		expect(result.body).toContain('width: 85%');
	});

	it('renders over-budget (>=100%) capped at 100% width and displays overrun deficit', () => {
		const result = render(BudgetCard, {
			props: { budget: overBudget }
		});

		expect(result.body).toContain('115%');
		expect(result.body).toContain('750,000');
		expect(result.body).toContain('width: 100%');
	});
});
