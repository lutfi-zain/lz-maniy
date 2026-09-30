import { describe, it, expect, beforeEach } from 'vitest';
import { accountsFilterStore } from './accounts-filter.svelte';

describe('accountsFilterStore in-memory persistence', () => {
	beforeEach(() => {
		accountsFilterStore.resetFilters();
	});

	it('initializes with default values', () => {
		expect(accountsFilterStore.searchQuery).toBe('');
		expect(accountsFilterStore.statusFilter).toBe('all');
		expect(accountsFilterStore.sortBy).toBe('balance_desc');
		expect(accountsFilterStore.viewMode).toBe('list');
		expect(accountsFilterStore.listViewStyle).toBe('grouped');
		expect(accountsFilterStore.hasActiveFilters).toBe(false);
	});

	it('updates filters reactively and detects active filters', () => {
		accountsFilterStore.searchQuery = 'BCA';
		expect(accountsFilterStore.searchQuery).toBe('BCA');
		expect(accountsFilterStore.hasActiveFilters).toBe(true);

		accountsFilterStore.statusFilter = 'locked';
		expect(accountsFilterStore.statusFilter).toBe('locked');

		accountsFilterStore.sortBy = 'name';
		expect(accountsFilterStore.sortBy).toBe('name');

		accountsFilterStore.viewMode = 'horizon';
		expect(accountsFilterStore.viewMode).toBe('horizon');

		accountsFilterStore.listViewStyle = 'flat';
		expect(accountsFilterStore.listViewStyle).toBe('flat');
	});

	it('resets filters back to defaults', () => {
		accountsFilterStore.searchQuery = 'Mandiri';
		accountsFilterStore.statusFilter = 'spendable';
		accountsFilterStore.viewMode = 'horizon';

		accountsFilterStore.resetFilters();
		expect(accountsFilterStore.searchQuery).toBe('');
		expect(accountsFilterStore.statusFilter).toBe('all');
		expect(accountsFilterStore.viewMode).toBe('list');
		expect(accountsFilterStore.hasActiveFilters).toBe(false);
	});
});
