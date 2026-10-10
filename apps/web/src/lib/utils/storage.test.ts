import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getStoredValue, setStoredValue, removeStoredValue } from './storage';

const mockStorage = new Map<string, string>();
const fakeLocalStorage = {
	getItem: (key: string) => mockStorage.get(key) ?? null,
	setItem: (key: string, val: string) => mockStorage.set(key, val),
	removeItem: (key: string) => mockStorage.delete(key),
	clear: () => mockStorage.clear()
};

vi.stubGlobal('localStorage', fakeLocalStorage);

describe('storage migration helper', () => {
	beforeEach(() => {
		mockStorage.clear();
	});

	it('returns modern key value if modern key exists', () => {
		mockStorage.set('maniy_test', JSON.stringify({ count: 42 }));
		mockStorage.set('maniyy_test', JSON.stringify({ count: 10 }));

		const val = getStoredValue('maniy_test', 'maniyy_test', { count: 0 });
		expect(val).toEqual({ count: 42 });
	});

	it('migrates legacy key to modern key if modern key is absent', () => {
		mockStorage.set('maniyy_test', JSON.stringify({ theme: 'dark' }));

		const val = getStoredValue('maniy_test', 'maniyy_test', { theme: 'light' });
		expect(val).toEqual({ theme: 'dark' });
		expect(mockStorage.get('maniy_test')).toBe(JSON.stringify({ theme: 'dark' }));
	});

	it('returns fallback value if neither key exists', () => {
		const val = getStoredValue('maniy_test', 'maniyy_test', 'default-val');
		expect(val).toBe('default-val');
	});

	it('sets stored value serializing objects', () => {
		setStoredValue('maniy_test', { active: true });
		expect(mockStorage.get('maniy_test')).toBe('{"active":true}');
	});

	it('removes both modern and legacy keys on removeStoredValue', () => {
		mockStorage.set('maniy_test', 'val1');
		mockStorage.set('maniyy_test', 'val2');

		removeStoredValue('maniy_test', 'maniyy_test');
		expect(mockStorage.has('maniy_test')).toBe(false);
		expect(mockStorage.has('maniyy_test')).toBe(false);
	});
});
