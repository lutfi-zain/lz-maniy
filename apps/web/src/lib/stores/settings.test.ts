import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SettingsStore, getDefaultActivePeriods } from './settings.svelte.js';

const mockStorage = new Map<string, string>();
const fakeLocalStorage = {
	getItem: (key: string) => mockStorage.get(key) ?? null,
	setItem: (key: string, val: string) => mockStorage.set(key, val),
	removeItem: (key: string) => mockStorage.delete(key),
	clear: () => mockStorage.clear()
};

vi.stubGlobal('localStorage', fakeLocalStorage);

describe('SettingsStore', () => {
	beforeEach(() => {
		mockStorage.clear();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('generates 3 consecutive periods from reference date', () => {
		const ref = new Date('2026-10-15T00:00:00Z');
		const periods = getDefaultActivePeriods(ref);
		expect(periods).toEqual(['2026-10', '2026-11', '2026-12']);
	});

	it('initializes with default active periods if none stored', async () => {
		const store = new SettingsStore();
		await store.load();

		expect(store.isLoaded).toBe(true);
		expect(store.settings.ledgerViewMode).toBe('single');
		expect(store.settings.activePeriods.length).toBe(3);
	});

	it('adds a period and maintains ascending order', () => {
		const store = new SettingsStore();
		store.settings.activePeriods = ['2026-10', '2026-12'];

		store.addPeriod('2026-11');
		expect(store.settings.activePeriods).toEqual(['2026-10', '2026-11', '2026-12']);

		// Duplicate add is a no-op
		store.addPeriod('2026-11');
		expect(store.settings.activePeriods).toEqual(['2026-10', '2026-11', '2026-12']);
	});

	it('removes a period respecting minimum 1 constraint', () => {
		const store = new SettingsStore();
		store.settings.activePeriods = ['2026-10', '2026-11'];

		store.removePeriod('2026-10');
		expect(store.settings.activePeriods).toEqual(['2026-11']);

		// Cannot remove when only 1 remains
		store.removePeriod('2026-11');
		expect(store.settings.activePeriods).toEqual(['2026-11']);
	});

	it('debounces PUT request on save', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({})
		});
		vi.stubGlobal('fetch', fetchMock);

		const store = new SettingsStore();
		await store.load('https://api.example.com', 'test-token');
		fetchMock.mockClear();

		store.save({ ledgerViewMode: 'calendar_board' });
		store.save({ activePeriods: ['2026-10', '2026-11'] });

		expect(fetchMock).not.toHaveBeenCalled();

		vi.advanceTimersByTime(500);

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock).toHaveBeenCalledWith(
			'https://api.example.com/api/settings',
			expect.objectContaining({
				method: 'PUT',
				body: JSON.stringify({ activePeriods: ['2026-10', '2026-11'] })
			})
		);
	});
});
