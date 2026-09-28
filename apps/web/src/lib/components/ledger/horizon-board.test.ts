import { describe, it, expect } from 'vitest';
import type { TransactionRecord, WalletItem } from '$lib/types/account-detail';
import { calculatePointInTimeWalletBalances } from '$lib/utils/networth-timeline.js';

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
describe('HorizonBoard Goal Snapshot Point-in-Time Derivation', () => {
	it('correctly tracks goal progress from linked wallet point-in-time balances across periods', () => {
		// Mock wallet: w-pocket has 5,000,000 baseline
		const wallets: WalletItem[] = [
			{
				walletId: 'w-pocket',
				walletName: 'Kantong Sewa Rumah',
				balance: 5_000_000,
				currency: 'IDR',
				type: 'bank',
				isLocked: 1,
				institution: 'BCA',
				lastTransaction: null
			}
		];

		// Goal: Target 10,000,000
		const goal = {
			goalId: 'g1',
			goalName: 'Sewa Rumah',
			targetAmount: 10_000_000,
			currentAmount: 5_000_000,
			progressPercentage: 50,
			isDerived: true,
			daysRemaining: 90,
			linkedWalletsBreakdown: [
				{
					walletId: 'w-pocket',
					walletName: 'Kantong Sewa Rumah',
					balance: 5_000_000,
					currency: 'IDR',
					convertedAmount: 5_000_000,
					usedPeg: false
				}
			]
		};

		// Future planned transactions:
		// Oct 2026: +2,500,000 transfer into w-pocket -> balance 7,500,000 (75%)
		// Nov 2026: -1,000,000 expense from w-pocket (using savings) -> balance 6,500,000 (65%)
		// Dec 2026: +4,000,000 saving into w-pocket -> balance 10,500,000 (105% - Milestone reached!)
		const txs: TransactionRecord[] = [
			{
				transactionId: 't-oct-save',
				transactionWalletId: 'w-main',
				transactionTargetWalletId: 'w-pocket',
				transactionAmount: 2_500_000,
				transactionType: 'transfer',
				transactionIsPlanned: 1,
				transactionDate: '2026-10-05T00:00:00+07:00'
			},
			{
				transactionId: 't-nov-use',
				transactionWalletId: 'w-pocket',
				transactionAmount: 1_000_000,
				transactionType: 'expense',
				transactionIsPlanned: 1,
				transactionDate: '2026-11-10T00:00:00+07:00'
			},
			{
				transactionId: 't-dec-save',
				transactionWalletId: 'w-main',
				transactionTargetWalletId: 'w-pocket',
				transactionAmount: 4_000_000,
				transactionType: 'transfer',
				transactionIsPlanned: 1,
				transactionDate: '2026-12-05T00:00:00+07:00'
			}
		];

		// Calculate for Oct 2026
		const octBalances = calculatePointInTimeWalletBalances({
			wallets,
			allTransactions: txs,
			endDate: '2026-10-31',
			referenceDate: '2026-09-28'
		});
		const octGoalAmt = goal.linkedWalletsBreakdown.reduce((sum, lw) => sum + (octBalances.get(lw.walletId) ?? lw.balance), 0);
		expect(octGoalAmt).toBe(7_500_000);
		expect(octGoalAmt / goal.targetAmount).toBe(0.75);

		// Calculate for Nov 2026 (reflecting withdrawal/expense!)
		const novBalances = calculatePointInTimeWalletBalances({
			wallets,
			allTransactions: txs,
			endDate: '2026-11-30',
			referenceDate: '2026-09-28'
		});
		const novGoalAmt = goal.linkedWalletsBreakdown.reduce((sum, lw) => sum + (novBalances.get(lw.walletId) ?? lw.balance), 0);
		expect(novGoalAmt).toBe(6_500_000);
		expect(novGoalAmt / goal.targetAmount).toBe(0.65);

		// Calculate for Dec 2026 (target reached!)
		const decBalances = calculatePointInTimeWalletBalances({
			wallets,
			allTransactions: txs,
			endDate: '2026-12-31',
			referenceDate: '2026-09-28'
		});
		const decGoalAmt = goal.linkedWalletsBreakdown.reduce((sum, lw) => sum + (decBalances.get(lw.walletId) ?? lw.balance), 0);
		expect(decGoalAmt).toBe(10_500_000);
		expect(decGoalAmt / goal.targetAmount).toBe(1.05);
	});
});
