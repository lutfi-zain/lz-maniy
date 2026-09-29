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

	it('renders safe budget with remaining headroom and neutral charcoal bar', () => {
		const result = render(BudgetCard, {
			props: { budget: safeBudget }
		});

		expect(result.body).toContain('Groceries &amp; Dining');
		expect(result.body).toContain('Category: Food &amp; Beverage');
		expect(result.body).toContain('74%');
		expect(result.body).toContain('On Track');
		expect(result.body).toContain('Remaining Headroom');
		expect(result.body).toContain('Rp 1,300,000 remaining');
		expect(result.body).toContain('Rp 3,700,000');
		expect(result.body).toContain('Rp 5,000,000');
		expect(result.body).toContain('width: 74%');
		expect(result.body).toContain('bg-[#111111]');
	});

	it('renders warning budget (>=80%) with amber progress bar and warning badge', () => {
		const result = render(BudgetCard, {
			props: { budget: warningBudget }
		});

		expect(result.body).toContain('85%');
		expect(result.body).toContain('Near Limit');
		expect(result.body).toContain('Rp 150,000 remaining');
		expect(result.body).toContain('bg-[#D97706]');
		expect(result.body).toContain('width: 85%');
	});

	it('renders over-budget (>=100%) with crimson bar capped at 100% width and overrun amount', () => {
		const result = render(BudgetCard, {
			props: { budget: overBudget }
		});

		expect(result.body).toContain('115%');
		expect(result.body).toContain('Over Budget');
		expect(result.body).toContain('Over Limit');
		expect(result.body).toContain('Over limit by Rp 750,000');
		expect(result.body).toContain('bg-[#9F2F2D]');
		expect(result.body).toContain('width: 100%');
	});

	it('supports Indonesian locale with appropriate financial terminology', () => {
		i18nStore.setLocale('id');
		const result = render(BudgetCard, {
			props: { budget: safeBudget }
		});

		expect(result.body).toContain('Kategori: Food &amp; Beverage');
		expect(result.body).toContain('Terkendali');
		expect(result.body).toContain('Sisa Pagu');
		expect(result.body).toContain('Sisa Rp 1.300.000 lagi');
		expect(result.body).toContain('Realisasi / Batas Pagu');
	});
});
