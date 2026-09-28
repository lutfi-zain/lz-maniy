import { describe, it, expect } from 'vitest';
import type { TransactionRecord } from '$lib/types/account-detail';

function filterTransactionsForPeriod(params: {
	transactions: TransactionRecord[];
	startDate: string;
	endDate: string;
	walletIds?: string[];
	categoryIds?: string[];
	type?: 'all' | 'expense' | 'income' | 'transfer';
	status?: 'all' | 'realized' | 'planned';
	searchKeyword?: string;
}): TransactionRecord[] {
	const {
		transactions,
		startDate,
		endDate,
		walletIds = [],
		categoryIds = [],
		type = 'all',
		status = 'all',
		searchKeyword = ''
	} = params;

	const q = searchKeyword.trim().toLowerCase();

	return transactions.filter((t) => {
		const txDate = t.transactionDate.slice(0, 10);
		if (txDate < startDate || txDate > endDate) return false;

		if (type !== 'all' && t.transactionType !== type) return false;
		if (status === 'realized' && t.transactionIsPlanned !== 0) return false;
		if (status === 'planned' && t.transactionIsPlanned !== 1) return false;

		if (walletIds.length > 0) {
			const isSource = walletIds.includes(t.transactionWalletId);
			const isTarget = t.transactionTargetWalletId
				? walletIds.includes(t.transactionTargetWalletId)
				: false;
			if (!isSource && !isTarget) return false;
		}

		if (categoryIds.length > 0) {
			if (!t.transactionCategoryId || !categoryIds.includes(t.transactionCategoryId)) {
				return false;
			}
		}

		if (q) {
			const desc = (t.transactionDescription || '').toLowerCase();
			const id = (t.transactionId || '').toLowerCase();
			if (!desc.includes(q) && !id.includes(q)) return false;
		}

		return true;
	});
}

describe('HorizonBoard Slicing and Filtering Logic', () => {
	const testTransactions: TransactionRecord[] = [
		{
			transactionId: 't1',
			transactionWalletId: 'w-bca',
			transactionCategoryId: 'cat-makan',
			transactionAmount: 50_000,
			transactionType: 'expense',
			transactionIsPlanned: 0,
			transactionDescription: 'Nasi Padang',
			transactionDate: '2026-10-05T12:00:00+07:00'
		},
		{
			transactionId: 't2',
			transactionWalletId: 'w-jago',
			transactionCategoryId: 'cat-transport',
			transactionAmount: 100_000,
			transactionType: 'expense',
			transactionIsPlanned: 1,
			transactionDescription: 'Bensin Shell',
			transactionDate: '2026-10-15T09:00:00+07:00'
		},
		{
			transactionId: 't3',
			transactionWalletId: 'w-bca',
			transactionCategoryId: 'cat-gaji',
			transactionAmount: 20_000_000,
			transactionType: 'income',
			transactionIsPlanned: 1,
			transactionDescription: 'Gaji November',
			transactionDate: '2026-11-05T08:00:00+07:00'
		},
		{
			transactionId: 't4',
			transactionWalletId: 'w-bca',
			transactionTargetWalletId: 'w-jago',
			transactionAmount: 3_000_000,
			transactionType: 'transfer',
			transactionIsPlanned: 1,
			transactionDescription: 'Nabung Dana Darurat',
			transactionDate: '2026-11-06T10:00:00+07:00'
		}
	];

	it('correctly slices transactions into their respective monthly periods', () => {
		const octTxs = filterTransactionsForPeriod({
			transactions: testTransactions,
			startDate: '2026-10-01',
			endDate: '2026-10-31'
		});
		expect(octTxs.map((t) => t.transactionId)).toEqual(['t1', 't2']);

		const novTxs = filterTransactionsForPeriod({
			transactions: testTransactions,
			startDate: '2026-11-01',
			endDate: '2026-11-30'
		});
		expect(novTxs.map((t) => t.transactionId)).toEqual(['t3', 't4']);

		const decTxs = filterTransactionsForPeriod({
			transactions: testTransactions,
			startDate: '2026-12-01',
			endDate: '2026-12-31'
		});
		expect(decTxs).toHaveLength(0);
	});

	it('intersects global wallet filter across period date boundaries', () => {
		const octJago = filterTransactionsForPeriod({
			transactions: testTransactions,
			startDate: '2026-10-01',
			endDate: '2026-10-31',
			walletIds: ['w-jago']
		});
		// In Oct: only t2 is w-jago
		expect(octJago.map((t) => t.transactionId)).toEqual(['t2']);

		const novJago = filterTransactionsForPeriod({
			transactions: testTransactions,
			startDate: '2026-11-01',
			endDate: '2026-11-30',
			walletIds: ['w-jago']
		});
		// In Nov: t4 has targetWalletId w-jago
		expect(novJago.map((t) => t.transactionId)).toEqual(['t4']);
	});

	it('filters by status (realized vs planned) within a period', () => {
		const octRealized = filterTransactionsForPeriod({
			transactions: testTransactions,
			startDate: '2026-10-01',
			endDate: '2026-10-31',
			status: 'realized'
		});
		expect(octRealized.map((t) => t.transactionId)).toEqual(['t1']);

		const octPlanned = filterTransactionsForPeriod({
			transactions: testTransactions,
			startDate: '2026-10-01',
			endDate: '2026-10-31',
			status: 'planned'
		});
		expect(octPlanned.map((t) => t.transactionId)).toEqual(['t2']);
	});
});
