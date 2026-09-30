import { describe, it, expect } from 'vitest';
import {
	calculateCategoryMetrics,
	sortCategoryMetrics,
	type CategoryMetricItem
} from './category-metrics';
import type { CategoryRecord, TransactionRecord, BudgetSnapshot } from '$lib/types/account-detail';

describe('category-metrics utility', () => {
	const mockCategories: CategoryRecord[] = [
		{
			categoryId: 'cat-1',
			categoryName: 'Makan & Minum',
			categoryType: 'expense',
			categoryIcon: '🍔'
		},
		{
			categoryId: 'cat-2',
			categoryName: 'Bensin & Transport',
			categoryType: 'expense',
			categoryIcon: '🚗'
		},
		{
			categoryId: 'cat-3',
			categoryName: 'Gaji & Bonus',
			categoryType: 'income',
			categoryIcon: '💼'
		},
		{ categoryId: 'cat-4', categoryName: 'Investasi', categoryType: 'income', categoryIcon: '📈' }
	];

	const mockBudgets: BudgetSnapshot[] = [
		{
			budgetId: 'b-1',
			budgetName: 'Pagu Makan',
			categoryId: 'cat-1',
			categoryName: 'Makan & Minum',
			amount: 5000000,
			spent: 1500000,
			remaining: 3500000,
			percentUsed: 30
		}
	];

	const mockTransactions: TransactionRecord[] = [
		{
			transactionId: 't-1',
			transactionWalletId: 'w-idr',
			transactionCategoryId: 'cat-1',
			transactionAmount: 100000,
			transactionType: 'expense',
			transactionDate: '2026-09-05T10:00:00Z',
			transactionIsPlanned: 0,
			transactionDescription: 'Lunch'
		},
		{
			transactionId: 't-2',
			transactionWalletId: 'w-idr',
			transactionCategoryId: 'cat-1',
			transactionAmount: 50000,
			transactionType: 'expense',
			transactionDate: '2026-09-12T12:00:00Z',
			transactionIsPlanned: 0,
			transactionDescription: 'Coffee'
		},
		{
			transactionId: 't-3',
			transactionWalletId: 'w-idr',
			transactionCategoryId: 'cat-2',
			transactionAmount: 50000,
			transactionType: 'expense',
			transactionDate: '2026-09-15T08:00:00Z',
			transactionIsPlanned: 0,
			transactionDescription: 'Fuel'
		},
		{
			transactionId: 't-4',
			transactionWalletId: 'w-idr',
			transactionCategoryId: 'cat-3',
			transactionAmount: 10000000,
			transactionType: 'income',
			transactionDate: '2026-09-01T09:00:00Z',
			transactionIsPlanned: 0,
			transactionDescription: 'Salary'
		},
		{
			transactionId: 't-5',
			transactionWalletId: 'w-idr',
			transactionCategoryId: 'cat-1',
			transactionAmount: 200000,
			transactionType: 'expense',
			transactionDate: '2026-08-25T10:00:00Z', // Out of September window
			transactionIsPlanned: 0,
			transactionDescription: 'August Dinner'
		},
		{
			transactionId: 't-6',
			transactionWalletId: 'w-idr',
			transactionCategoryId: 'cat-1',
			transactionAmount: 300000,
			transactionType: 'transfer', // Ignored transfer
			transactionDate: '2026-09-10T10:00:00Z',
			transactionIsPlanned: 0,
			transactionDescription: 'Transfer funds'
		}
	];

	it('aggregates nominals and counts within date range', () => {
		const stats = calculateCategoryMetrics({
			categories: mockCategories,
			transactions: mockTransactions,
			budgets: mockBudgets,
			startDate: '2026-09-01',
			endDate: '2026-09-30'
		});

		expect(stats.totalExpenseIDR).toBe(200000); // 100k + 50k (cat-1) + 50k (cat-2)
		expect(stats.totalIncomeIDR).toBe(10000000); // 10M (cat-3)

		const cat1 = stats.items.find((i) => i.category.categoryId === 'cat-1');
		expect(cat1).toBeDefined();
		expect(cat1?.totalAmountIDR).toBe(150000);
		expect(cat1?.transactionCount).toBe(2);
		expect(cat1?.percentageOfTotal).toBeCloseTo(75, 1); // 150k / 200k = 75%
		expect(cat1?.linkedBudget?.budgetId).toBe('b-1');

		const cat2 = stats.items.find((i) => i.category.categoryId === 'cat-2');
		expect(cat2?.totalAmountIDR).toBe(50000);
		expect(cat2?.transactionCount).toBe(1);
		expect(cat2?.percentageOfTotal).toBeCloseTo(25, 1); // 50k / 200k = 25%

		expect(stats.dominantExpenseCategory?.category.categoryId).toBe('cat-1');
	});

	it('handles zero-transaction categories safely', () => {
		const stats = calculateCategoryMetrics({
			categories: mockCategories,
			transactions: [],
			budgets: []
		});

		expect(stats.totalExpenseIDR).toBe(0);
		expect(stats.totalIncomeIDR).toBe(0);
		expect(stats.dominantExpenseCategory).toBeNull();

		for (const item of stats.items) {
			expect(item.totalAmountIDR).toBe(0);
			expect(item.transactionCount).toBe(0);
			expect(item.percentageOfTotal).toBe(0);
		}
	});

	it('sorts category items correctly by multiple criteria', () => {
		const items: CategoryMetricItem[] = [
			{
				category: { categoryId: '1', categoryName: 'Zebra', categoryType: 'expense' },
				totalAmountIDR: 50000,
				transactionCount: 10,
				percentageOfTotal: 10
			},
			{
				category: { categoryId: '2', categoryName: 'Apple', categoryType: 'expense' },
				totalAmountIDR: 200000,
				transactionCount: 2,
				percentageOfTotal: 40
			},
			{
				category: { categoryId: '3', categoryName: 'Banana', categoryType: 'expense' },
				totalAmountIDR: 100000,
				transactionCount: 5,
				percentageOfTotal: 20
			}
		];

		const byBalanceDesc = sortCategoryMetrics(items, 'balance_desc');
		expect(byBalanceDesc.map((i) => i.category.categoryName)).toEqual(['Apple', 'Banana', 'Zebra']);

		const byBalanceAsc = sortCategoryMetrics(items, 'balance_asc');
		expect(byBalanceAsc.map((i) => i.category.categoryName)).toEqual(['Zebra', 'Banana', 'Apple']);

		const byCountDesc = sortCategoryMetrics(items, 'count_desc');
		expect(byCountDesc.map((i) => i.category.categoryName)).toEqual(['Zebra', 'Banana', 'Apple']);

		const byNameAsc = sortCategoryMetrics(items, 'name_asc');
		expect(byNameAsc.map((i) => i.category.categoryName)).toEqual(['Apple', 'Banana', 'Zebra']);
	});
});
