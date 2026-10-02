import type { TransactionRecord, WalletItem } from '$lib/types/account-detail';
import { dFmt } from '$lib/utils/dates';
import { getConvertedBalanceInIDR } from '$lib/utils/currency';

export interface PointInTimeNetWorthResult {
	label: 'PROYEKSI NET WORTH' | 'NET WORTH SAAT INI' | 'NET WORTH PENUTUPAN';
	amount: number;
	spendableAmount: number;
	lockedAmount: number;
	subtext: string;
	horizon: 'future' | 'present' | 'past';
	netDelta: number;
}

/**
 * Calculates deterministic point-in-time portfolio Net Worth and Spendable/Locked liquidity breakdown
 * anchored to the filter's ending horizon (T_akhir).
 *
 * Mathematical rules:
 * 1. Future Horizon (T_akhir > current calendar month):
 *    Projected Net Worth = Current Net Worth + Planned Net Flow from today up to T_akhir (converted to IDR).
 *    Spendable/Locked amounts are adjusted by planned flows and intra-wallet transfers.
 * 2. Present Horizon (T_akhir in current calendar month, today, or unbounded):
 *    Current Net Worth = Live consolidated portfolio Net Worth in IDR.
 * 3. Past Horizon (T_akhir < current calendar month):
 *    Historical Closing Net Worth = Current Net Worth - Settled Net Flow from T_akhir to today (converted to IDR).
 */
export function calculatePointInTimeNetWorth(params: {
	currentNetWorth: number;
	allTransactions: TransactionRecord[];
	endDate?: string | null;
	referenceDate?: string;
	wallets?: WalletItem[];
	walletCurrencyMap?: Map<string, string> | Record<string, string>;
	walletLockedMap?: Map<string, boolean | number> | Record<string, boolean | number>;
	currentSpendable?: number;
	currentLocked?: number;
	customRates?: Record<string, number>;
}): PointInTimeNetWorthResult {
	const {
		currentNetWorth,
		allTransactions,
		endDate,
		referenceDate,
		wallets,
		walletCurrencyMap,
		walletLockedMap,
		currentSpendable: passedSpendable,
		currentLocked: passedLocked,
		customRates
	} = params;

	// Resolve currency for a given wallet ID
	function getCurrency(walletId: string): string {
		if (walletCurrencyMap instanceof Map) {
			const c = walletCurrencyMap.get(walletId);
			if (c) return c;
		} else if (walletCurrencyMap && typeof walletCurrencyMap === 'object') {
			const c = (walletCurrencyMap as Record<string, string>)[walletId];
			if (c) return c;
		}
		if (wallets) {
			const w = wallets.find((x) => x.walletId === walletId);
			if (w?.currency) return w.currency;
		}
		return 'IDR';
	}

	// Resolve locked status for a given wallet ID
	function isLocked(walletId: string): boolean {
		if (walletLockedMap instanceof Map) {
			const l = walletLockedMap.get(walletId);
			if (l !== undefined) return Boolean(l);
		} else if (walletLockedMap && typeof walletLockedMap === 'object') {
			const l = (walletLockedMap as Record<string, boolean | number>)[walletId];
			if (l !== undefined) return Boolean(l);
		}
		if (wallets) {
			const w = wallets.find((x) => x.walletId === walletId);
			if (w) return w.isLocked === 1;
		}
		return false;
	}

	// Compute base starting spendable and locked amounts in IDR
	let baseSpendable = passedSpendable ?? 0;
	let baseLocked = passedLocked ?? 0;

	if (passedSpendable === undefined && wallets) {
		baseSpendable = 0;
		baseLocked = 0;
		for (const w of wallets) {
			const val = getConvertedBalanceInIDR(w.balance, w.currency, customRates);
			if (w.isLocked === 1) {
				baseLocked += val;
			} else {
				baseSpendable += val;
			}
		}
	} else if (passedSpendable === undefined) {
		// Fallback: assume total currentNetWorth is spendable if no breakdown provided
		baseSpendable = currentNetWorth;
		baseLocked = 0;
	}

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
			spendableAmount: baseSpendable,
			lockedAmount: baseLocked,
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
		let futureSpendableDelta = 0;
		let futureLockedDelta = 0;

		for (const t of allTransactions) {
			const tDate = t.transactionDate.slice(0, 10);
			// Include transactions between today and T_akhir
			if (tDate > todayStr && tDate <= endClean) {
				const srcLocked = isLocked(t.transactionWalletId);
				const curr = getCurrency(t.transactionWalletId);
				const amtIDR = getConvertedBalanceInIDR(t.transactionAmount, curr, customRates);

				if (t.transactionType === 'income') {
					futureDelta += amtIDR;
					if (srcLocked) futureLockedDelta += amtIDR;
					else futureSpendableDelta += amtIDR;
				} else if (t.transactionType === 'expense') {
					futureDelta -= amtIDR;
					if (srcLocked) futureLockedDelta -= amtIDR;
					else futureSpendableDelta -= amtIDR;
				} else if (t.transactionType === 'transfer') {
					// Source wallet deduction
					if (srcLocked) futureLockedDelta -= amtIDR;
					else futureSpendableDelta -= amtIDR;

					// Target wallet addition (if specified)
					if (t.transactionTargetWalletId) {
						const tgtLocked = isLocked(t.transactionTargetWalletId);
						const tgtCurr = getCurrency(t.transactionTargetWalletId);
						const tgtAmtIDR = getConvertedBalanceInIDR(t.transactionAmount, tgtCurr, customRates);
						if (tgtLocked) futureLockedDelta += tgtAmtIDR;
						else futureSpendableDelta += tgtAmtIDR;
					}
				}
			}
		}

		return {
			label: 'PROYEKSI NET WORTH',
			amount: currentNetWorth + futureDelta,
			spendableAmount: baseSpendable + futureSpendableDelta,
			lockedAmount: baseLocked + futureLockedDelta,
			subtext: `proyeksi per ${dFmt(endClean)} (pasca seluruh rencana)`,
			horizon: 'future',
			netDelta: futureDelta
		};
	}

	// Case 3: Historical Past Horizon (T_akhir is in a prior month before current month)
	if (endYearMonth < currYearMonth) {
		let settledSinceCutoff = 0;
		let settledSpendableSinceCutoff = 0;
		let settledLockedSinceCutoff = 0;

		for (const t of allTransactions) {
			const tDate = t.transactionDate.slice(0, 10);
			// Only sum transactions that occurred between T_akhir and today
			if (tDate > endClean && tDate <= todayStr && t.transactionIsPlanned !== 1) {
				const srcLocked = isLocked(t.transactionWalletId);
				const curr = getCurrency(t.transactionWalletId);
				const amtIDR = getConvertedBalanceInIDR(t.transactionAmount, curr, customRates);

				if (t.transactionType === 'income') {
					settledSinceCutoff += amtIDR;
					if (srcLocked) settledLockedSinceCutoff += amtIDR;
					else settledSpendableSinceCutoff += amtIDR;
				} else if (t.transactionType === 'expense') {
					settledSinceCutoff -= amtIDR;
					if (srcLocked) settledLockedSinceCutoff -= amtIDR;
					else settledSpendableSinceCutoff -= amtIDR;
				} else if (t.transactionType === 'transfer') {
					if (srcLocked) settledLockedSinceCutoff -= amtIDR;
					else settledSpendableSinceCutoff -= amtIDR;

					if (t.transactionTargetWalletId) {
						const tgtLocked = isLocked(t.transactionTargetWalletId);
						const tgtCurr = getCurrency(t.transactionTargetWalletId);
						const tgtAmtIDR = getConvertedBalanceInIDR(t.transactionAmount, tgtCurr, customRates);
						if (tgtLocked) settledLockedSinceCutoff += tgtAmtIDR;
						else settledSpendableSinceCutoff += tgtAmtIDR;
					}
				}
			}
		}

		return {
			label: 'NET WORTH PENUTUPAN',
			amount: currentNetWorth - settledSinceCutoff,
			spendableAmount: baseSpendable - settledSpendableSinceCutoff,
			lockedAmount: baseLocked - settledLockedSinceCutoff,
			subtext: `posisi saldo per ${dFmt(endClean)} (penutupan historis)`,
			horizon: 'past',
			netDelta: -settledSinceCutoff
		};
	}

	// Case 4: Present Horizon (T_akhir is within current calendar month)
	return {
		label: 'NET WORTH SAAT INI',
		amount: currentNetWorth,
		spendableAmount: baseSpendable,
		lockedAmount: baseLocked,
		subtext: 'posisi likuiditas terkonsolidasi',
		horizon: 'present',
		netDelta: 0
	};
}

/**
 * Calculates deterministic point-in-time balances for every individual wallet at horizon T_akhir.
 * Returns Map<walletId, balanceAtHorizon> in native currency.
 */
export function calculatePointInTimeWalletBalances(params: {
	wallets: WalletItem[];
	allTransactions: TransactionRecord[];
	endDate?: string | null;
	referenceDate?: string;
}): Map<string, number> {
	const { wallets, allTransactions, endDate, referenceDate } = params;

	const balanceMap = new Map<string, number>();
	for (const w of wallets) {
		balanceMap.set(w.walletId, w.balance);
	}

	// Unbounded or no date -> current balances
	if (!endDate || endDate.trim() === '') {
		return balanceMap;
	}

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
	const endClean = endDate.slice(0, 10);
	const endYearMonth = endClean.slice(0, 7);

	// Case 1: Future Horizon (T_akhir > current calendar month)
	if (endYearMonth > currYearMonth) {
		for (const t of allTransactions) {
			const tDate = t.transactionDate.slice(0, 10);
			if (tDate > todayStr && tDate <= endClean) {
				const srcId = t.transactionWalletId;
				const currentSrc = balanceMap.get(srcId) ?? 0;

				if (t.transactionType === 'income') {
					balanceMap.set(srcId, currentSrc + t.transactionAmount);
				} else if (t.transactionType === 'expense') {
					balanceMap.set(srcId, currentSrc - t.transactionAmount);
				} else if (t.transactionType === 'transfer') {
					balanceMap.set(srcId, currentSrc - t.transactionAmount);
					if (t.transactionTargetWalletId) {
						const tgtId = t.transactionTargetWalletId;
						const currentTgt = balanceMap.get(tgtId) ?? 0;
						balanceMap.set(tgtId, currentTgt + t.transactionAmount);
					}
				}
			}
		}
		return balanceMap;
	}

	// Case 2: Historical Past Horizon (T_akhir < current calendar month)
	if (endYearMonth < currYearMonth) {
		for (const t of allTransactions) {
			const tDate = t.transactionDate.slice(0, 10);
			// Deduct/reverse transactions that occurred between cutoff and today
			if (tDate > endClean && t.transactionIsPlanned !== 1) {
				const srcId = t.transactionWalletId;
				const currentSrc = balanceMap.get(srcId) ?? 0;

				if (t.transactionType === 'income') {
					balanceMap.set(srcId, currentSrc - t.transactionAmount);
				} else if (t.transactionType === 'expense') {
					balanceMap.set(srcId, currentSrc + t.transactionAmount);
				} else if (t.transactionType === 'transfer') {
					balanceMap.set(srcId, currentSrc + t.transactionAmount);
					if (t.transactionTargetWalletId) {
						const tgtId = t.transactionTargetWalletId;
						const currentTgt = balanceMap.get(tgtId) ?? 0;
						balanceMap.set(tgtId, currentTgt - t.transactionAmount);
					}
				}
			}
		}
		return balanceMap;
	}

	// Case 3: Present Month
	return balanceMap;
}
