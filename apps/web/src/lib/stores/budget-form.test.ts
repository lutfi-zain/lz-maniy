import { describe, it, expect, beforeEach } from 'vitest';
import { BudgetFormStore } from './budget-form.svelte';
import type { BudgetSnapshot } from '$lib/types/account-detail';

const sampleBudget: BudgetSnapshot = {
	budgetId: 'bgt-10',
	budgetName: 'Makan & Resto',
	categoryName: 'Makanan',
	categoryId: 'cat-food',
	amount: 2500000,
	spent: 1200000,
	remaining: 1300000,
	percentUsed: 48,
	status: 'on_track',
	periodStart: '2026-09-01T00:00:00Z',
	periodEnd: '2026-09-30T23:59:59Z'
};

describe('BudgetFormStore', () => {
	let store: BudgetFormStore;

	beforeEach(() => {
		store = new BudgetFormStore();
	});

	it('initializes with default state', () => {
		expect(store.isOpen).toBe(false);
		expect(store.mode).toBe('create');
		expect(store.name).toBe('');
		expect(store.amount).toBeNull();
	});

	it('openCreate() sets default current month period dates', () => {
		store.openCreate();
		expect(store.isOpen).toBe(true);
		expect(store.mode).toBe('create');
		expect(store.periodStart).toMatch(/^\d{4}-\d{2}-01$/);
		expect(store.periodEnd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	it('openEdit() populates fields from budget', () => {
		store.openEdit(sampleBudget);
		expect(store.isOpen).toBe(true);
		expect(store.mode).toBe('edit');
		expect(store.name).toBe('Makan & Resto');
		expect(store.amount).toBe(2500000);
		expect(store.periodStart).toBe('2026-09-01');
		expect(store.periodEnd).toBe('2026-09-30');
		expect(store.categoryId).toBe('cat-food');
	});

	it('isValid rejects empty name, non-positive amount, or invalid date range', () => {
		store.openCreate();
		expect(store.isValid).toBe(false);

		store.name = 'Pagu';
		store.amount = -100;
		expect(store.isValid).toBe(false);

		store.amount = 1000000;
		expect(store.isValid).toBe(true);

		// Period end before start
		store.periodStart = '2026-10-01';
		store.periodEnd = '2026-09-01';
		expect(store.isValid).toBe(false);
	});
});
