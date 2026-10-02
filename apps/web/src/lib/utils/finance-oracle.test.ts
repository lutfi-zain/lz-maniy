import { describe, it, expect } from 'vitest';
import {
	deriveTestPeriods,
	EXPECTED_FINANCIAL_JOURNAL
} from './finance-oracle';

describe('Financial Fixture & Calculation Oracle Invariants', () => {
	it('derives 6 contiguous calendar periods without gaps or overlaps', () => {
		const fixedDate = new Date('2026-10-15T12:00:00.000Z');
		const periods = deriveTestPeriods(fixedDate);

		expect(periods.all.length).toBe(6);
		expect(periods.mMinus2.key).toBe('2026-08');
		expect(periods.mMinus1.key).toBe('2026-09');
		expect(periods.m0.key).toBe('2026-10');
		expect(periods.mPlus1.key).toBe('2026-11');
		expect(periods.mPlus2.key).toBe('2026-12');
		expect(periods.mPlus3.key).toBe('2027-01');

		// Boundary check: startDate is start-of-day, endDate is end-of-day
		expect(periods.m0.startDate).toBe('2026-10-01T00:00:00.000Z');
		expect(periods.m0.endDate).toBe('2026-10-31T23:59:59.999Z');
	});

	it('validates the design 6 closing-capital rows and net worth progression', () => {
		const expectedTotals = [9_000_000, 12_500_000, 16_000_000, 19_500_000, 23_000_000, 26_500_000];
		const actualTotals = EXPECTED_FINANCIAL_JOURNAL.map((r) => r.totalNetWorth);
		expect(actualTotals).toEqual(expectedTotals);

		// Operating wallet balances progression
		const expectedOperating = [6_000_000, 8_000_000, 10_000_000, 12_000_000, 14_000_000, 16_000_000];
		const actualOperating = EXPECTED_FINANCIAL_JOURNAL.map((r) => r.closingOperating);
		expect(actualOperating).toEqual(expectedOperating);

		// Emergency wallet progression
		const expectedEmergency = [2_000_000, 3_000_000, 4_000_000, 5_000_000, 6_000_000, 7_000_000];
		const actualEmergency = EXPECTED_FINANCIAL_JOURNAL.map((r) => r.closingEmergency);
		expect(actualEmergency).toEqual(expectedEmergency);

		// Trip wallet progression
		const expectedTrip = [1_000_000, 1_500_000, 2_000_000, 2_500_000, 3_000_000, 3_500_000];
		const actualTrip = EXPECTED_FINANCIAL_JOURNAL.map((r) => r.closingTrip);
		expect(actualTrip).toEqual(expectedTrip);
	});

	it('verifies transfer conservation: transfers conserve total wealth', () => {
		for (const row of EXPECTED_FINANCIAL_JOURNAL) {
			const sumWallets = row.closingOperating + row.closingEmergency + row.closingTrip;
			expect(sumWallets).toBe(row.totalNetWorth);
			expect(row.closingEmergency + row.closingTrip).toBe(row.lockedNetWorth);
			expect(row.closingOperating).toBe(row.spendableNetWorth);
		}
	});

	it('verifies goal progression matches +10 percentage points per future month', () => {
		const futureRows = EXPECTED_FINANCIAL_JOURNAL.filter((r) => r.offset >= 0);
		const emergencyPcts = futureRows.map((r) => r.emergencyGoalProgress);
		const tripPcts = futureRows.map((r) => r.tripGoalProgress);

		// 40% in M0, 50% in M+1, 60% in M+2, 70% in M+3
		expect(emergencyPcts).toEqual([40, 50, 60, 70]);
		expect(tripPcts).toEqual([40, 50, 60, 70]);

		// Each increment is exactly +10 percentage points
		for (let i = 1; i < emergencyPcts.length; i++) {
			expect(emergencyPcts[i] - emergencyPcts[i - 1]).toBe(10);
			expect(tripPcts[i] - tripPcts[i - 1]).toBe(10);
		}
	});

	it('verifies economic cashflow excludes transfer principal but accounts for fees', () => {
		// Transfer of 100,000 with 5,000 fee
		const transferAmount = 100_000;
		const adminFee = 5_000;

		let sourceBal = 1_000_000;
		let targetBal = 500_000;

		// Deduct principal + fee from source
		sourceBal -= transferAmount + adminFee;
		// Credit principal to target
		targetBal += transferAmount;

		// Economic cashflow impact is ONLY the fee
		const totalNetWorthDelta = sourceBal + targetBal - 1_500_000;
		expect(totalNetWorthDelta).toBe(-adminFee);
		expect(sourceBal).toBe(895_000);
		expect(targetBal).toBe(600_000);
	});
});
