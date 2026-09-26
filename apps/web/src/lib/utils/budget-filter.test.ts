import { describe, it, expect } from 'vitest';
import { matchesBudgetFilter } from './budget-filter';
import type { TransactionRecord, BudgetSnapshot } from '$lib/types/account-detail';

describe('Budget Filtering Logic (matchesBudgetFilter)', () => {
	const mockBudgetMap = new Map<string, BudgetSnapshot>([
		[
			'b-rumah',
			{
				budgetId: 'b-rumah',
				budgetName: 'Jenguk Rumah',
				categoryName: 'Sewa Rumah',
				amount: 2500000,
				spent: 1500000,
				remaining: 1000000,
				percentUsed: 60,
				status: 'on_track'
			}
		],
		[
			'b-makan',
			{
				budgetId: 'b-makan',
				budgetName: 'Makan & Minum',
				categoryName: 'Makanan & Minuman',
				amount: 3000000,
				spent: 1200000,
				remaining: 1800000,
				percentUsed: 40,
				status: 'on_track'
			}
		]
	]);

	const mockCategoryResolver = (catId?: string | null) => {
		if (catId === 'c-sewa') return 'Sewa Rumah';
		if (catId === 'c-food') return 'Makanan & Minuman';
		return catId || '';
	};

	it('matches all transactions when selectedBudgetIds is empty', () => {
		const tx: TransactionRecord = {
			transactionId: 'tx-1',
			transactionWalletId: 'w-1',
			transactionAmount: 100000,
			transactionType: 'expense',
			transactionIsPlanned: 0,
			transactionDate: '2026-09-25T10:00:00Z',
			transactionBudgetId: null
		};

		expect(matchesBudgetFilter(tx, [], mockBudgetMap, mockCategoryResolver)).toBe(true);
	});

	it('matches transaction directly when transactionBudgetId matches selected budget', () => {
		const tx: TransactionRecord = {
			transactionId: 'tx-2',
			transactionWalletId: 'w-1',
			transactionAmount: 500000,
			transactionType: 'expense',
			transactionIsPlanned: 0,
			transactionDate: '2026-09-25T10:00:00Z',
			transactionBudgetId: 'b-rumah'
		};

		expect(matchesBudgetFilter(tx, ['b-rumah'], mockBudgetMap, mockCategoryResolver)).toBe(true);
		expect(matchesBudgetFilter(tx, ['b-makan'], mockBudgetMap, mockCategoryResolver)).toBe(false);
	});

	it('falls back to category matching when transactionBudgetId is null', () => {
		const txWithCat: TransactionRecord = {
			transactionId: 'tx-3',
			transactionWalletId: 'w-1',
			transactionCategoryId: 'c-sewa',
			transactionAmount: 250000,
			transactionType: 'expense',
			transactionIsPlanned: 0,
			transactionDate: '2026-09-25T10:00:00Z',
			transactionBudgetId: null
		};

		expect(matchesBudgetFilter(txWithCat, ['b-rumah'], mockBudgetMap, mockCategoryResolver)).toBe(
			true
		);
		expect(matchesBudgetFilter(txWithCat, ['b-makan'], mockBudgetMap, mockCategoryResolver)).toBe(
			false
		);
	});

	it('returns false when neither budget ID nor category matches', () => {
		const txOther: TransactionRecord = {
			transactionId: 'tx-4',
			transactionWalletId: 'w-1',
			transactionCategoryId: 'c-other',
			transactionAmount: 50000,
			transactionType: 'expense',
			transactionIsPlanned: 0,
			transactionDate: '2026-09-25T10:00:00Z',
			transactionBudgetId: null
		};

		expect(matchesBudgetFilter(txOther, ['b-rumah'], mockBudgetMap, mockCategoryResolver)).toBe(
			false
		);
	});
});
