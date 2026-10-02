/**
 * Independent Financial Fixture & Calculation Oracle
 * Grounded in design.md specifications with zero production math dependencies.
 */

export interface PeriodDefinition {
	key: string; // e.g. "2026-08", "2026-09", "2026-10", etc.
	startDate: string; // full ISO instant (start of day UTC)
	endDate: string; // full ISO instant (end of day UTC)
}

export interface ExpectedWalletBalances {
	operating: number;
	emergency: number;
	trip: number;
}

export interface ExpectedPeriodState {
	period: string; // "M-2", "M-1", "M0", "M+1", "M+2", "M+3"
	periodKey: string;
	openingBalances: ExpectedWalletBalances;
	closingBalances: ExpectedWalletBalances;
	income: number;
	expense: number;
	netCashflow: number;
	totalNetWorth: number;
	lockedNetWorth: number;
	spendableNetWorth: number;
	emergencyGoalProgress: number; // percentage
	tripGoalProgress: number; // percentage
}

/**
 * Derives the 6 consecutive calendar periods centered around reference date (M0).
 */
export function deriveTestPeriods(referenceDate: Date = new Date()): {
	mMinus2: PeriodDefinition;
	mMinus1: PeriodDefinition;
	m0: PeriodDefinition;
	mPlus1: PeriodDefinition;
	mPlus2: PeriodDefinition;
	mPlus3: PeriodDefinition;
	all: PeriodDefinition[];
} {
	const curYear = referenceDate.getUTCFullYear();
	const curMonth = referenceDate.getUTCMonth(); // 0-indexed

	function makePeriod(offset: number): PeriodDefinition {
		const d = new Date(Date.UTC(curYear, curMonth + offset, 1));
		const y = d.getUTCFullYear();
		const m = String(d.getUTCMonth() + 1).padStart(2, '0');
		const key = `${y}-${m}`;
		const lastDay = new Date(Date.UTC(y, d.getUTCMonth() + 1, 0)).getUTCDate();
		return {
			key,
			startDate: `${key}-01T00:00:00.000Z`,
			endDate: `${key}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`
		};
	}

	const mMinus2 = makePeriod(-2);
	const mMinus1 = makePeriod(-1);
	const m0 = makePeriod(0);
	const mPlus1 = makePeriod(1);
	const mPlus2 = makePeriod(2);
	const mPlus3 = makePeriod(3);

	return {
		mMinus2,
		mMinus1,
		m0,
		mPlus1,
		mPlus2,
		mPlus3,
		all: [mMinus2, mMinus1, m0, mPlus1, mPlus2, mPlus3]
	};
}

/**
 * Expected values table according to design.md
 */
export const EXPECTED_FINANCIAL_JOURNAL: Array<{
	periodName: string;
	offset: number;
	income: number;
	expense: number;
	toEmergency: number;
	toTrip: number;
	closingOperating: number;
	closingEmergency: number;
	closingTrip: number;
	totalNetWorth: number;
	lockedNetWorth: number;
	spendableNetWorth: number;
	emergencyGoalProgress: number;
	tripGoalProgress: number;
}> = [
	{
		periodName: 'M-2',
		offset: -2,
		income: 10_000_000,
		expense: 1_000_000,
		toEmergency: 2_000_000,
		toTrip: 1_000_000,
		closingOperating: 6_000_000,
		closingEmergency: 2_000_000,
		closingTrip: 1_000_000,
		totalNetWorth: 9_000_000,
		lockedNetWorth: 3_000_000,
		spendableNetWorth: 6_000_000,
		emergencyGoalProgress: 20,
		tripGoalProgress: 20
	},
	{
		periodName: 'M-1',
		offset: -1,
		income: 5_000_000,
		expense: 1_500_000,
		toEmergency: 1_000_000,
		toTrip: 500_000,
		closingOperating: 8_000_000,
		closingEmergency: 3_000_000,
		closingTrip: 1_500_000,
		totalNetWorth: 12_500_000,
		lockedNetWorth: 4_500_000,
		spendableNetWorth: 8_000_000,
		emergencyGoalProgress: 30,
		tripGoalProgress: 30
	},
	{
		periodName: 'M0',
		offset: 0,
		income: 5_000_000,
		expense: 1_500_000,
		toEmergency: 1_000_000,
		toTrip: 500_000,
		closingOperating: 10_000_000,
		closingEmergency: 4_000_000,
		closingTrip: 2_000_000,
		totalNetWorth: 16_000_000,
		lockedNetWorth: 6_000_000,
		spendableNetWorth: 10_000_000,
		emergencyGoalProgress: 40,
		tripGoalProgress: 40
	},
	{
		periodName: 'M+1',
		offset: 1,
		income: 5_000_000,
		expense: 1_500_000,
		toEmergency: 1_000_000,
		toTrip: 500_000,
		closingOperating: 12_000_000,
		closingEmergency: 5_000_000,
		closingTrip: 2_500_000,
		totalNetWorth: 19_500_000,
		lockedNetWorth: 7_500_000,
		spendableNetWorth: 12_000_000,
		emergencyGoalProgress: 50,
		tripGoalProgress: 50
	},
	{
		periodName: 'M+2',
		offset: 2,
		income: 5_000_000,
		expense: 1_500_000,
		toEmergency: 1_000_000,
		toTrip: 500_000,
		closingOperating: 14_000_000,
		closingEmergency: 6_000_000,
		closingTrip: 3_000_000,
		totalNetWorth: 23_000_000,
		lockedNetWorth: 9_000_000,
		spendableNetWorth: 14_000_000,
		emergencyGoalProgress: 60,
		tripGoalProgress: 60
	},
	{
		periodName: 'M+3',
		offset: 3,
		income: 5_000_000,
		expense: 1_500_000,
		toEmergency: 1_000_000,
		toTrip: 500_000,
		closingOperating: 16_000_000,
		closingEmergency: 7_000_000,
		closingTrip: 3_500_000,
		totalNetWorth: 26_500_000,
		lockedNetWorth: 10_500_000,
		spendableNetWorth: 16_000_000,
		emergencyGoalProgress: 70,
		tripGoalProgress: 70
	}
];
