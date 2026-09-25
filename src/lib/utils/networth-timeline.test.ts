import { describe, it, expect } from 'vitest';
import { calculatePointInTimeNetWorth } from './networth-timeline';
import type { TransactionRecord } from '$lib/types/account-detail';

describe('calculatePointInTimeNetWorth', () => {
	const baselineNetWorth = 25_461_999;
	const referenceDate = '2026-09-24';

	const mockTransactions: TransactionRecord[] = [
		// Past transaction (August)
		{
			transactionId: 'tx-aug-1',
			transactionWalletId: 'w1',
			transactionAmount: 10_000_000,
			transactionType: 'income',
			transactionDescription: 'Gaji Agustus',
			transactionIsPlanned: 0,
			transactionDate: '2026-08-25T10:00:00+07:00'
		},
		// Past transaction (September before reference date)
		{
			transactionId: 'tx-sep-1',
			transactionWalletId: 'w1',
			transactionAmount: 15_000_000,
			transactionType: 'income',
			transactionDescription: 'Gaji September',
			transactionIsPlanned: 0,
			transactionDate: '2026-09-01T08:00:00+07:00'
		},
		{
			transactionId: 'tx-sep-2',
			transactionWalletId: 'w1',
			transactionAmount: 3_000_000,
			transactionType: 'expense',
			transactionDescription: 'Belanja Bulanan',
			transactionIsPlanned: 0,
			transactionDate: '2026-09-10T12:00:00+07:00'
		},
		// Future planned transaction (October)
		{
			transactionId: 'tx-oct-1',
			transactionWalletId: 'w1',
			transactionAmount: 5_000_000,
			transactionType: 'expense',
			transactionDescription: 'Sewa Rumah Oktober',
			transactionIsPlanned: 1,
			transactionDate: '2026-10-05T09:00:00+07:00'
		},
		{
			transactionId: 'tx-oct-2',
			transactionWalletId: 'w1',
			transactionAmount: 1_200_000,
			transactionType: 'expense',
			transactionDescription: 'Cicilan Motor',
			transactionIsPlanned: 1,
			transactionDate: '2026-10-15T09:00:00+07:00'
		},
		{
			transactionId: 'tx-oct-3',
			transactionWalletId: 'w1',
			transactionAmount: 2_000_000,
			transactionType: 'income',
			transactionDescription: 'Dividen',
			transactionIsPlanned: 1,
			transactionDate: '2026-10-20T10:00:00+07:00'
		}
	];

	it('returns NET WORTH SAAT INI when endDate is not provided or empty (All Time)', () => {
		const res = calculatePointInTimeNetWorth({
			currentNetWorth: baselineNetWorth,
			allTransactions: mockTransactions,
			endDate: '',
			referenceDate
		});

		expect(res.horizon).toBe('present');
		expect(res.label).toBe('NET WORTH SAAT INI');
		expect(res.amount).toBe(baselineNetWorth);
		expect(res.subtext).toBe('posisi likuiditas terkonsolidasi');
		expect(res.netDelta).toBe(0);
	});

	it('returns NET WORTH SAAT INI when endDate is within the current calendar month', () => {
		const res = calculatePointInTimeNetWorth({
			currentNetWorth: baselineNetWorth,
			allTransactions: mockTransactions,
			endDate: '2026-09-30',
			referenceDate
		});

		expect(res.horizon).toBe('present');
		expect(res.label).toBe('NET WORTH SAAT INI');
		expect(res.amount).toBe(baselineNetWorth);
		expect(res.subtext).toBe('posisi likuiditas terkonsolidasi');
	});

	it('returns PROYEKSI NET WORTH when endDate is in the future (next month)', () => {
		// In October:
		// Planned Expense: -5,000,000 - 1,200,000 = -6,200,000
		// Planned Income: +2,000,000
		// Net Future Delta: -4,200,000
		// Expected Amount: 25,461,999 - 4,200,000 = 21,261,999
		const res = calculatePointInTimeNetWorth({
			currentNetWorth: baselineNetWorth,
			allTransactions: mockTransactions,
			endDate: '2026-10-31',
			referenceDate
		});

		expect(res.horizon).toBe('future');
		expect(res.label).toBe('PROYEKSI NET WORTH');
		expect(res.netDelta).toBe(-4_200_000);
		expect(res.amount).toBe(21_261_999);
		expect(res.subtext).toContain('proyeksi per');
		expect(res.subtext).toContain('pasca seluruh rencana');
	});

	it('returns NET WORTH PENUTUPAN when endDate is in a prior month (August)', () => {
		// Between August 31 and September 24:
		// tx-sep-1 (income 15,000,000) + tx-sep-2 (expense 3,000,000)
		// Net Flow since August 31 = +12,000,000
		// Closing Net Worth on August 31 = 25,461,999 - 12,000,000 = 13,461,999
		const res = calculatePointInTimeNetWorth({
			currentNetWorth: baselineNetWorth,
			allTransactions: mockTransactions,
			endDate: '2026-08-31',
			referenceDate
		});

		expect(res.horizon).toBe('past');
		expect(res.label).toBe('NET WORTH PENUTUPAN');
		expect(res.amount).toBe(13_461_999);
		expect(res.subtext).toContain('penutupan historis');
	});

	it('retains constant global net worth anchor regardless of local filter narrowing', () => {
		// When calculating point-in-time net worth, allTransactions is passed
		// rather than filteredTransactions, ensuring the anchor is unaffected by category filter
		const resGlobal = calculatePointInTimeNetWorth({
			currentNetWorth: baselineNetWorth,
			allTransactions: mockTransactions,
			endDate: '2026-10-31',
			referenceDate
		});

		expect(resGlobal.amount).toBe(21_261_999);
	});

	it('converts foreign currency (USDT) transactions to IDR accurately in future projection', () => {
		const walletCurrencyMap = new Map<string, string>([
			['w-idr', 'IDR'],
			['w-crypto', 'USDT']
		]);

		const txsWithCrypto: TransactionRecord[] = [
			// 100 USDT planned expense (~Rp 1.783.582,58 @ DEFAULT_USDT_TO_IDR_RATE)
			{
				transactionId: 'tx-usdt-1',
				transactionWalletId: 'w-crypto',
				transactionAmount: 100,
				transactionType: 'expense',
				transactionDescription: 'Crypto Cloud Server Renewal',
				transactionIsPlanned: 1,
				transactionDate: '2026-10-10T12:00:00+07:00'
			}
		];

		const res = calculatePointInTimeNetWorth({
			currentNetWorth: 20_000_000,
			allTransactions: txsWithCrypto,
			endDate: '2026-10-31',
			referenceDate,
			walletCurrencyMap
		});

		// 100 * 17835.8258 = 1,783,582.58
		// Expected netWorth: 20,000,000 - 1,783,582.58 = 18,216,417.42
		expect(res.horizon).toBe('future');
		expect(res.label).toBe('PROYEKSI NET WORTH');
		expect(Math.round(res.amount)).toBe(Math.round(20_000_000 - 1_783_582.58));
		expect(Math.round(res.netDelta)).toBe(Math.round(-1_783_582.58));
	});

	it('converts foreign currency (USDT) transactions to IDR accurately in historical closing balance', () => {
		const walletCurrencyMap = new Map<string, string>([['w-crypto', 'USDT']]);

		const pastTxsWithCrypto: TransactionRecord[] = [
			// 50 USDT realized income between August 31 and September 24
			// 50 * 17835.8258 = 891,791.29
			{
				transactionId: 'tx-usdt-past',
				transactionWalletId: 'w-crypto',
				transactionAmount: 50,
				transactionType: 'income',
				transactionDescription: 'Crypto Staking Payout',
				transactionIsPlanned: 0,
				transactionDate: '2026-09-05T10:00:00+07:00'
			}
		];

		const res = calculatePointInTimeNetWorth({
			currentNetWorth: 20_000_000,
			allTransactions: pastTxsWithCrypto,
			endDate: '2026-08-31',
			referenceDate,
			walletCurrencyMap
		});

		// Net Flow since August 31 = +891,791.29
		// Closing Net Worth on August 31 = 20,000,000 - 891,791.29 = 19,108,208.71
		expect(res.horizon).toBe('past');
		expect(res.label).toBe('NET WORTH PENUTUPAN');
		expect(Math.round(res.amount)).toBe(Math.round(20_000_000 - 891_791.29));
	});
});
