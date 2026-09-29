import { describe, it, expect, beforeEach } from 'vitest';
import { i18nStore, t, type TranslationKey } from '../index';
import { en } from '../locales/en';
import { id } from '../locales/id';

describe('i18n Engine & Dictionaries', () => {
	beforeEach(() => {
		i18nStore.setLocale('en');
	});

	it('should default to English locale', () => {
		expect(i18nStore.locale).toBe('en');
		expect(t('nav.cockpit')).toBe('Cockpit');
		expect(t('cockpit.netWorth')).toBe('Net Worth');
	});

	it('should interpolate dynamic parameters correctly', () => {
		expect(t('cockpit.topCount', { count: 6 })).toBe('Top 6');
		expect(t('planning.categories.countLabel', { count: 12 })).toBe('12 categories');
	});

	it('should reactively switch to Indonesian and resolve localized strings', () => {
		i18nStore.setLocale('id');
		expect(i18nStore.locale).toBe('id');
		expect(t('nav.cockpit')).toBe('Kokpit');
		expect(t('cockpit.netWorth')).toBe('Kekayaan Bersih');
		expect(t('planning.categories.countLabel', { count: 12 })).toBe('12 kategori');
	});

	it('should toggle between locales', () => {
		expect(i18nStore.locale).toBe('en');
		i18nStore.toggleLocale();
		expect(i18nStore.locale).toBe('id');
		i18nStore.toggleLocale();
		expect(i18nStore.locale).toBe('en');
	});

	it('should have 100% dictionary key parity between English and Indonesian', () => {
		function getKeys(obj: Record<string, unknown>, prefix = ''): string[] {
			let keys: string[] = [];
			for (const [key, value] of Object.entries(obj)) {
				const fullPath = prefix ? `${prefix}.${key}` : key;
				if (value && typeof value === 'object') {
					keys = keys.concat(getKeys(value as Record<string, unknown>, fullPath));
				} else {
					keys.push(fullPath);
				}
			}
			return keys;
		}

		const enKeys = getKeys(en as unknown as Record<string, unknown>).sort();
		const idKeys = getKeys(id as unknown as Record<string, unknown>).sort();

		expect(idKeys).toEqual(enKeys);

		// Ensure all keys resolve to non-empty strings
		for (const key of enKeys) {
			const enVal = t(key as TranslationKey);
			expect(enVal.length).toBeGreaterThan(0);
		}
	});
});
