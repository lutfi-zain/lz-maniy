import { describe, it, expect, beforeEach } from 'vitest';
import { ledgerFilterStore } from './ledger-filter.svelte';

describe('ledgerFilterStore in-memory persistence', () => {
	beforeEach(() => {
		ledgerFilterStore.resetFilters();
	});

	it('initializes with default empty filters', () => {
		expect(ledgerFilterStore.walletIds).toEqual([]);
		expect(ledgerFilterStore.categoryIds).toEqual([]);
		expect(ledgerFilterStore.budgetIds).toEqual([]);
		expect(ledgerFilterStore.type).toBe('all');
		expect(ledgerFilterStore.status).toBe('all');
		expect(ledgerFilterStore.searchKeyword).toBe('');
		expect(ledgerFilterStore.currentPage).toBe(1);
		expect(ledgerFilterStore.pageSize).toBe(50);
		expect(ledgerFilterStore.hasActiveFilters).toBe(false);
	});

	it('updates filters and resets currentPage to 1', () => {
		ledgerFilterStore.currentPage = 4;
		expect(ledgerFilterStore.currentPage).toBe(4);

		ledgerFilterStore.walletIds = ['w-bca'];
		expect(ledgerFilterStore.walletIds).toEqual(['w-bca']);
		expect(ledgerFilterStore.currentPage).toBe(1);
		expect(ledgerFilterStore.hasActiveFilters).toBe(true);

		ledgerFilterStore.categoryIds = ['c-makan'];
		expect(ledgerFilterStore.categoryIds).toEqual(['c-makan']);

		ledgerFilterStore.type = 'expense';
		expect(ledgerFilterStore.type).toBe('expense');

		ledgerFilterStore.status = 'planned';
		expect(ledgerFilterStore.status).toBe('planned');

		ledgerFilterStore.searchKeyword = 'kopi';
		expect(ledgerFilterStore.searchKeyword).toBe('kopi');
	});

	it('handles search keyword and marks active filter', () => {
		ledgerFilterStore.currentPage = 3;
		ledgerFilterStore.searchKeyword = 'test';
		expect(ledgerFilterStore.searchKeyword).toBe('test');
		expect(ledgerFilterStore.currentPage).toBe(1);
		expect(ledgerFilterStore.hasActiveFilters).toBe(true);
	});

	it('manages budget filters correctly', () => {
		ledgerFilterStore.setBudgetFilter('b-123', 'Renovasi Rumah');
		expect(ledgerFilterStore.budgetIds).toEqual(['b-123']);
		expect(ledgerFilterStore.budgetFilterName).toBe('Renovasi Rumah');
		expect(ledgerFilterStore.hasActiveFilters).toBe(true);

		ledgerFilterStore.clearBudgetFilter();
		expect(ledgerFilterStore.budgetIds).toEqual([]);
		expect(ledgerFilterStore.budgetFilterName).toBe('');
	});

	it('resets all filters back to default', () => {
		ledgerFilterStore.walletIds = ['w-1'];
		ledgerFilterStore.categoryIds = ['c-1'];
		ledgerFilterStore.type = 'income';
		ledgerFilterStore.searchKeyword = 'gaji';

		expect(ledgerFilterStore.hasActiveFilters).toBe(true);

		ledgerFilterStore.resetFilters();
		expect(ledgerFilterStore.hasActiveFilters).toBe(false);
		expect(ledgerFilterStore.walletIds).toEqual([]);
		expect(ledgerFilterStore.categoryIds).toEqual([]);
		expect(ledgerFilterStore.type).toBe('all');
		expect(ledgerFilterStore.searchKeyword).toBe('');
	});
});
