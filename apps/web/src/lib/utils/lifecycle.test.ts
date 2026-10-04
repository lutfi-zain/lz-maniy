import { describe, it, expect } from 'vitest';
import { resolveGoalLifecycle, resolveBudgetPeriod, computeDaysDifference } from './lifecycle';
import type { GoalSnapshot, BudgetSnapshot } from '$lib/types/account-detail';

describe('Lifecycle Utility Tests', () => {
	const fixedToday = new Date('2026-10-15T12:00:00Z');

	describe('computeDaysDifference', () => {
		it('returns positive for future dates', () => {
			expect(computeDaysDifference('2026-10-20', fixedToday)).toBe(5);
		});

		it('returns 0 for same calendar day', () => {
			expect(computeDaysDifference('2026-10-15', fixedToday)).toBe(0);
		});

		it('returns negative for past dates', () => {
			expect(computeDaysDifference('2026-10-10', fixedToday)).toBe(-5);
		});
	});

	describe('resolveGoalLifecycle', () => {
		const baseGoal: GoalSnapshot = {
			goalId: 'g-1',
			goalName: 'Dana Darurat',
			targetAmount: 10000000,
			currentAmount: 5000000,
			targetDate: '2026-12-31',
			progressPercentage: 50,
			isDerived: false,
			daysRemaining: 77
		};

		it('identifies in_progress goal with future target date', () => {
			const res = resolveGoalLifecycle(baseGoal, fixedToday);
			expect(res.status).toBe('in_progress');
			expect(res.isCompleted).toBe(false);
			expect(res.isOverdue).toBe(false);
			expect(res.daysRemaining).toBeGreaterThan(0);
			expect(res.remainingAmount).toBe(5000000);
		});

		it('identifies overdue goal when target date has passed and target not reached', () => {
			const overdueGoal: GoalSnapshot = {
				...baseGoal,
				targetDate: '2026-10-01',
				currentAmount: 4000000
			};
			const res = resolveGoalLifecycle(overdueGoal, fixedToday);
			expect(res.status).toBe('overdue');
			expect(res.isOverdue).toBe(true);
			expect(res.isCompleted).toBe(false);
			expect(res.overdueDays).toBe(14);
		});

		it('identifies completed goal when currentAmount >= targetAmount even if overdue', () => {
			const completedGoal: GoalSnapshot = {
				...baseGoal,
				targetDate: '2026-10-01',
				currentAmount: 12000000
			};
			const res = resolveGoalLifecycle(completedGoal, fixedToday);
			expect(res.status).toBe('completed');
			expect(res.isCompleted).toBe(true);
			expect(res.isOverdue).toBe(false);
			expect(res.remainingAmount).toBe(0);
		});

		it('identifies completed goal when status is explicitly completed', () => {
			const completedGoal: GoalSnapshot = {
				...baseGoal,
				status: 'completed',
				currentAmount: 8000000
			};
			const res = resolveGoalLifecycle(completedGoal, fixedToday);
			expect(res.status).toBe('completed');
			expect(res.isCompleted).toBe(true);
		});

		it('identifies long_term goal when targetDate is null', () => {
			const longTermGoal: GoalSnapshot = {
				...baseGoal,
				targetDate: null
			};
			const res = resolveGoalLifecycle(longTermGoal, fixedToday);
			expect(res.status).toBe('long_term');
			expect(res.daysRemaining).toBeNull();
			expect(res.isOverdue).toBe(false);
		});

		it('computes live sum from linkedWalletsBreakdown when present', () => {
			const derivedGoal: GoalSnapshot = {
				...baseGoal,
				currentAmount: 0,
				linkedWalletsBreakdown: [
					{
						walletId: 'w1',
						walletName: 'BCA',
						balance: 6000000,
						currency: 'IDR',
						convertedAmount: 6000000,
						usedPeg: false
					},
					{
						walletId: 'w2',
						walletName: 'Jago',
						balance: 5000000,
						currency: 'IDR',
						convertedAmount: 5000000,
						usedPeg: false
					}
				]
			};
			const res = resolveGoalLifecycle(derivedGoal, fixedToday);
			expect(res.status).toBe('completed');
			expect(res.progressPercentage).toBe(110);
		});

		it('evaluates status relative to custom referenceDate across target deadline', () => {
			const goal: GoalSnapshot = {
				...baseGoal,
				targetDate: '2026-11-01',
				currentAmount: 5000000,
				targetAmount: 10000000
			};
			const beforeDeadline = resolveGoalLifecycle(goal, new Date('2026-10-20T12:00:00Z'));
			expect(beforeDeadline.status).toBe('in_progress');
			expect(beforeDeadline.isOverdue).toBe(false);
			expect(beforeDeadline.daysRemaining).toBe(12);

			const afterDeadline = resolveGoalLifecycle(goal, new Date('2026-11-10T12:00:00Z'));
			expect(afterDeadline.status).toBe('overdue');
			expect(afterDeadline.isOverdue).toBe(true);
			expect(afterDeadline.overdueDays).toBe(9);
		});

		it('uses overrideCurrentAmount when provided for point-in-time calculation', () => {
			const goal: GoalSnapshot = {
				...baseGoal,
				currentAmount: 2000000,
				targetAmount: 10000000,
				targetDate: '2026-12-31'
			};
			const overridden = resolveGoalLifecycle(goal, fixedToday, 12000000);
			expect(overridden.status).toBe('completed');
			expect(overridden.progressPercentage).toBe(120);
			expect(overridden.remainingAmount).toBe(0);
			expect(overridden.isCompleted).toBe(true);
		});
	});

	describe('resolveBudgetPeriod', () => {
		const baseBudget: BudgetSnapshot = {
			budgetId: 'b-1',
			budgetName: 'Makan & Minum',
			amount: 3000000,
			spent: 1500000,
			remaining: 1500000,
			percentUsed: 50,
			periodStart: '2026-10-01T00:00:00Z',
			periodEnd: '2026-10-31T23:59:59Z'
		};

		it('identifies active_period budget when today is within periodStart and periodEnd', () => {
			const res = resolveBudgetPeriod(baseBudget, fixedToday);
			expect(res.status).toBe('active_period');
			expect(res.isActive).toBe(true);
			expect(res.isPast).toBe(false);
		});

		it('identifies past_period budget when periodEnd is earlier than today', () => {
			const pastBudget: BudgetSnapshot = {
				...baseBudget,
				periodStart: '2026-09-01T00:00:00Z',
				periodEnd: '2026-09-30T23:59:59Z'
			};
			const res = resolveBudgetPeriod(pastBudget, fixedToday);
			expect(res.status).toBe('past_period');
			expect(res.isPast).toBe(true);
			expect(res.isActive).toBe(false);
		});

		it('identifies upcoming_period budget when periodStart is in the future', () => {
			const upcomingBudget: BudgetSnapshot = {
				...baseBudget,
				periodStart: '2026-11-01T00:00:00Z',
				periodEnd: '2026-11-30T23:59:59Z'
			};
			const res = resolveBudgetPeriod(upcomingBudget, fixedToday);
			expect(res.status).toBe('upcoming_period');
			expect(res.isUpcoming).toBe(true);
			expect(res.isActive).toBe(false);
		});
	});
});
