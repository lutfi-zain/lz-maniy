import { describe, it, expect, beforeEach } from 'vitest';
import { GoalFormStore } from './goal-form.svelte';
import type { GoalSnapshot } from '$lib/types/account-detail';

const sampleGoal: GoalSnapshot = {
	goalId: 'g-10',
	goalName: 'Laptop Baru',
	targetAmount: 25000000,
	currentAmount: 10000000,
	currency: 'IDR',
	targetDate: '2026-12-31',
	categoryId: 'cat-elec',
	notes: 'MacBook Pro M-series',
	status: 'in_progress',
	progressPercentage: 40,
	isDerived: true,
	daysRemaining: 94,
	linkedWalletsBreakdown: [
		{
			walletId: 'w-1',
			walletName: 'BCA Main',
			balance: 10000000,
			currency: 'IDR',
			convertedAmount: 10000000,
			usedPeg: false
		}
	]
};

describe('GoalFormStore', () => {
	let store: GoalFormStore;

	beforeEach(() => {
		store = new GoalFormStore();
	});

	it('initializes with default state', () => {
		expect(store.isOpen).toBe(false);
		expect(store.mode).toBe('create');
		expect(store.name).toBe('');
		expect(store.targetAmount).toBeNull();
		expect(store.walletIds).toEqual([]);
		expect(store.isDerived).toBe(false);
	});

	it('openCreate() resets fields', () => {
		store.openCreate();
		expect(store.isOpen).toBe(true);
		expect(store.mode).toBe('create');
		expect(store.name).toBe('');
	});

	it('openEdit() populates fields and sets walletIds from linkedWalletsBreakdown', () => {
		store.openEdit(sampleGoal);
		expect(store.isOpen).toBe(true);
		expect(store.mode).toBe('edit');
		expect(store.name).toBe('Laptop Baru');
		expect(store.targetAmount).toBe(25000000);
		expect(store.walletIds).toEqual(['w-1']);
		expect(store.isDerived).toBe(true);
		expect(store.targetDate).toBe('2026-12-31');
		expect(store.status).toBe('in_progress');
	});

	it('isValid rejects empty name or non-positive target amount', () => {
		store.openCreate();
		expect(store.isValid).toBe(false);

		store.name = 'Dana Darurat';
		store.targetAmount = 0;
		expect(store.isValid).toBe(false);

		store.targetAmount = 50000000;
		expect(store.isValid).toBe(true);
	});

	it('openEditWithHydration() sets isHydrating and populates data', async () => {
		await store.openEditWithHydration(sampleGoal.goalId, sampleGoal);
		expect(store.isHydrating).toBe(false);
		expect(store.name).toBe('Laptop Baru');
		expect(store.notes).toBe('MacBook Pro M-series');
	});
});
