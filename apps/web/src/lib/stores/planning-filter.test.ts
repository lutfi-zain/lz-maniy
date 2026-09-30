import { describe, it, expect, beforeEach } from 'vitest';
import { planningFilterStore } from './planning-filter.svelte';

describe('planningFilterStore in-memory persistence', () => {
	beforeEach(() => {
		planningFilterStore.resetFilters();
	});

	it('initializes with default values', () => {
		expect(planningFilterStore.activeSubTab).toBe('goals');
		expect(planningFilterStore.goalFilter).toBe('all');
		expect(planningFilterStore.budgetFilter).toBe('active');
		expect(planningFilterStore.goalsViewMode).toBe('list');
	});

	it('updates subtab and filters reactively', () => {
		planningFilterStore.activeSubTab = 'budgets';
		expect(planningFilterStore.activeSubTab).toBe('budgets');

		planningFilterStore.goalFilter = 'overdue';
		expect(planningFilterStore.goalFilter).toBe('overdue');

		planningFilterStore.budgetFilter = 'past';
		expect(planningFilterStore.budgetFilter).toBe('past');

		planningFilterStore.goalsViewMode = 'horizon';
		expect(planningFilterStore.goalsViewMode).toBe('horizon');
	});

	it('resets filters back to defaults', () => {
		planningFilterStore.activeSubTab = 'categories';
		planningFilterStore.goalFilter = 'completed';
		planningFilterStore.goalsViewMode = 'horizon';

		planningFilterStore.resetFilters();
		expect(planningFilterStore.activeSubTab).toBe('goals');
		expect(planningFilterStore.goalFilter).toBe('all');
		expect(planningFilterStore.goalsViewMode).toBe('list');
	});
});
