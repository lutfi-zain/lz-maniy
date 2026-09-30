import type { GoalSnapshot, BudgetSnapshot } from '$lib/types/account-detail';

export type GoalLifecycleStatus = 'completed' | 'overdue' | 'in_progress' | 'long_term';
export type BudgetPeriodStatus = 'active_period' | 'past_period' | 'upcoming_period';

export interface GoalLifecycleResult {
	status: GoalLifecycleStatus;
	daysRemaining: number | null;
	isOverdue: boolean;
	isCompleted: boolean;
	overdueDays: number;
	remainingAmount: number;
	progressPercentage: number;
}

export interface BudgetPeriodResult {
	status: BudgetPeriodStatus;
	isPast: boolean;
	isActive: boolean;
	isUpcoming: boolean;
	periodLabel: string;
}

/**
 * Normalizes date to midnight UTC/local ISO string YYYY-MM-DD for accurate calendar day difference.
 */
function toDateOnly(d: Date | string): string {
	if (typeof d === 'string') {
		return d.slice(0, 10);
	}
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Computes calendar day difference (targetDate - referenceDate).
 * Positive = future, 0 = today, Negative = past.
 */
export function computeDaysDifference(
	targetDateStr: string,
	referenceDate: Date = new Date()
): number {
	const refStr = toDateOnly(referenceDate);
	const target = new Date(targetDateStr.slice(0, 10) + 'T00:00:00');
	const ref = new Date(refStr + 'T00:00:00');
	const diffMs = target.getTime() - ref.getTime();
	return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Resolves a goal's lifecycle status against reference date.
 */
export function resolveGoalLifecycle(
	goal: GoalSnapshot,
	referenceDate: Date = new Date()
): GoalLifecycleResult {
	const liveCurrent =
		goal.linkedWalletsBreakdown && goal.linkedWalletsBreakdown.length > 0
			? goal.linkedWalletsBreakdown.reduce((sum, lw) => sum + lw.convertedAmount, 0)
			: goal.currentAmount;

	const target = goal.targetAmount || 1;
	const progressPercentage = Math.round((liveCurrent / target) * 100);
	const remainingAmount = Math.max(0, target - liveCurrent);
	const isCompleted = liveCurrent >= target || goal.status === 'completed';

	if (isCompleted) {
		return {
			status: 'completed',
			daysRemaining: goal.targetDate ? computeDaysDifference(goal.targetDate, referenceDate) : null,
			isOverdue: false,
			isCompleted: true,
			overdueDays: 0,
			remainingAmount: 0,
			progressPercentage
		};
	}

	if (!goal.targetDate) {
		return {
			status: 'long_term',
			daysRemaining: null,
			isOverdue: false,
			isCompleted: false,
			overdueDays: 0,
			remainingAmount,
			progressPercentage
		};
	}

	const diffDays = computeDaysDifference(goal.targetDate, referenceDate);
	if (diffDays < 0) {
		const overdueDays = Math.abs(diffDays);
		return {
			status: 'overdue',
			daysRemaining: diffDays,
			isOverdue: true,
			isCompleted: false,
			overdueDays,
			remainingAmount,
			progressPercentage
		};
	}

	return {
		status: 'in_progress',
		daysRemaining: diffDays,
		isOverdue: false,
		isCompleted: false,
		overdueDays: 0,
		remainingAmount,
		progressPercentage
	};
}

/**
 * Resolves a budget's period status against reference date.
 */
export function resolveBudgetPeriod(
	budget: BudgetSnapshot,
	referenceDate: Date = new Date()
): BudgetPeriodResult {
	const refStr = toDateOnly(referenceDate);

	if (!budget.periodStart || !budget.periodEnd) {
		return {
			status: 'active_period',
			isPast: false,
			isActive: true,
			isUpcoming: false,
			periodLabel: 'Periode Berjalan'
		};
	}

	const startStr = toDateOnly(budget.periodStart);
	const endStr = toDateOnly(budget.periodEnd);

	if (refStr > endStr) {
		return {
			status: 'past_period',
			isPast: true,
			isActive: false,
			isUpcoming: false,
			periodLabel: 'Riwayat Lampau'
		};
	}

	if (refStr < startStr) {
		return {
			status: 'upcoming_period',
			isPast: false,
			isActive: false,
			isUpcoming: true,
			periodLabel: 'Akan Datang'
		};
	}

	return {
		status: 'active_period',
		isPast: false,
		isActive: true,
		isUpcoming: false,
		periodLabel: 'Bulan Ini'
	};
}
