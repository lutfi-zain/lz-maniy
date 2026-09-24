import type { TransactionRecord } from '$lib/types/account-detail';
import { dFmt } from '$lib/utils/dates';

export interface PointInTimeNetWorthResult {
	label: 'PROYEKSI NET WORTH' | 'NET WORTH SAAT INI' | 'NET WORTH PENUTUPAN';
	amount: number;
	subtext: string;
	horizon: 'future' | 'present' | 'past';
	netDelta: number;
}

/**
 * Calculates deterministic point-in-time portfolio Net Worth anchored to the filter's ending horizon (T_akhir).
 *
 * Mathematical rules:
 * 1. Future Horizon (T_akhir > current calendar month):
 *    Projected Net Worth = Current Net Worth + Planned Net Flow from today up to T_akhir.
 * 2. Present Horizon (T_akhir in current calendar month, today, or unbounded):
 *    Current Net Worth = Live consolidated portfolio Net Worth.
 * 3. Past Horizon (T_akhir < current calendar month):
 *    Historical Closing Net Worth = Current Net Worth - Settled Net Flow from T_akhir to today.
 */
export function calculatePointInTimeNetWorth(params: {
	currentNetWorth: number;
	allTransactions: TransactionRecord[];
	endDate?: string | null;
	referenceDate?: string;
}): PointInTimeNetWorthResult {
	const { currentNetWorth, allTransactions, endDate, referenceDate } = params;

	// Use provided reference date or fallback to current date in YYYY-MM-DD
	const todayStr =
		referenceDate ||
		(() => {
			const d = new Date();
			const y = d.getFullYear();
			const m = String(d.getMonth() + 1).padStart(2, '0');
			const day = String(d.getDate()).padStart(2, '0');
			return `${y}-${m}-${day}`;
		})();

	const currYearMonth = todayStr.slice(0, 7);

	// Case 1: No end date specified (All Time / unbounded)
	if (!endDate || endDate.trim() === '') {
		return {
			label: 'NET WORTH SAAT INI',
			amount: currentNetWorth,
			subtext: 'posisi likuiditas terkonsolidasi',
			horizon: 'present',
			netDelta: 0
		};
	}

	const endClean = endDate.slice(0, 10);
	const endYearMonth = endClean.slice(0, 7);

	// Case 2: Future Horizon (T_akhir is in a future month beyond current month)
	if (endYearMonth > currYearMonth) {
		let futureDelta = 0;

		for (const t of allTransactions) {
			const tDate = t.transactionDate.slice(0, 10);
			// Include transactions between today and T_akhir
			if (tDate > todayStr && tDate <= endClean) {
				if (t.transactionType === 'income') {
					futureDelta += t.transactionAmount;
				} else if (t.transactionType === 'expense') {
					futureDelta -= t.transactionAmount;
				}
			}
		}

		return {
			label: 'PROYEKSI NET WORTH',
			amount: currentNetWorth + futureDelta,
			subtext: `proyeksi per ${dFmt(endClean)} (pasca seluruh rencana)`,
			horizon: 'future',
			netDelta: futureDelta
		};
	}

	// Case 3: Historical Past Horizon (T_akhir is in a prior month before current month)
	if (endYearMonth < currYearMonth) {
		let settledSinceCutoff = 0;

		for (const t of allTransactions) {
			const tDate = t.transactionDate.slice(0, 10);
			// Only sum transactions that occurred between T_akhir and today
			if (tDate > endClean && tDate <= todayStr && t.transactionIsPlanned !== 1) {
				if (t.transactionType === 'income') {
					settledSinceCutoff += t.transactionAmount;
				} else if (t.transactionType === 'expense') {
					settledSinceCutoff -= t.transactionAmount;
				}
			}
		}

		return {
			label: 'NET WORTH PENUTUPAN',
			amount: currentNetWorth - settledSinceCutoff,
			subtext: `posisi saldo per ${dFmt(endClean)} (penutupan historis)`,
			horizon: 'past',
			netDelta: -settledSinceCutoff
		};
	}

	// Case 4: Present Horizon (T_akhir is within current calendar month)
	return {
		label: 'NET WORTH SAAT INI',
		amount: currentNetWorth,
		subtext: 'posisi likuiditas terkonsolidasi',
		horizon: 'present',
		netDelta: 0
	};
}
