import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DateFilterStore } from './date-filter.svelte';

const mockStorage = new Map<string, string>();
const fakeLocalStorage = {
	getItem: (key: string) => mockStorage.get(key) ?? null,
	setItem: (key: string, val: string) => mockStorage.set(key, val),
	removeItem: (key: string) => mockStorage.delete(key),
	clear: () => mockStorage.clear()
};

vi.stubGlobal('localStorage', fakeLocalStorage);

describe('DateFilterStore Persistence & Invariants', () => {
	beforeEach(() => {
		mockStorage.clear();
	});

	it('initializes to this_month default when storage is empty', () => {
		const store = new DateFilterStore();
		expect(store.preset).toBe('this_month');
		expect(store.startDate).toMatch(/^\d{4}-\d{2}-01$/);
		expect(store.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(store.isInitialized).toBe(true);
	});

	it('persists selected date range to localStorage', () => {
		const store = new DateFilterStore();
		store.setFilter('next_month', '2026-10-01', '2026-10-31');

		expect(store.preset).toBe('next_month');
		expect(store.startDate).toBe('2026-10-01');
		expect(store.endDate).toBe('2026-10-31');

		const savedRaw = mockStorage.get('maniy_date_filter');
		expect(savedRaw).toBeDefined();
		const saved = JSON.parse(savedRaw!);
		expect(saved.preset).toBe('next_month');
		expect(saved.startDate).toBe('2026-10-01');
		expect(saved.endDate).toBe('2026-10-31');
	});

	it('reloads saved filter from storage across new instances / reloads', () => {
		mockStorage.set(
			'maniyy_date_filter',
			JSON.stringify({
				preset: 'last_month',
				startDate: '2026-08-01',
				endDate: '2026-08-31',
				lastUpdated: 123456789
			})
		);

		const store = new DateFilterStore();
		expect(store.preset).toBe('last_month');
		expect(store.startDate).toBe('2026-08-01');
		expect(store.endDate).toBe('2026-08-31');
	});

	it('resets to current month and purges localStorage on reset()', () => {
		const store = new DateFilterStore();
		store.setFilter('custom', '2026-06-01', '2026-06-15');
		expect(mockStorage.has('maniy_date_filter')).toBe(true);

		store.reset();

		expect(store.preset).toBe('this_month');
		expect(store.startDate).toMatch(/^\d{4}-\d{2}-01$/);
		expect(mockStorage.has('maniy_date_filter')).toBe(false);
		expect(mockStorage.has('maniyy_date_filter')).toBe(false);
	});
});
