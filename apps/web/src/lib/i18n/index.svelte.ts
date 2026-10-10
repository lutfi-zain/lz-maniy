import { en, type TranslationSchema } from './locales/en';
import { id } from './locales/id';
import type { Locale, NestedKeyOf, TranslationParams } from './types';

export type TranslationKey = NestedKeyOf<TranslationSchema>;

import { getStoredValue, setStoredValue } from '$lib/utils/storage';

const MODERN_STORAGE_KEY = 'maniy_locale';
const LEGACY_STORAGE_KEY = 'maniyy_locale';

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
	const parts = path.split('.');
	let current: unknown = obj;
	for (const part of parts) {
		if (current && typeof current === 'object' && part in current) {
			current = (current as Record<string, unknown>)[part];
		} else {
			return undefined;
		}
	}
	return typeof current === 'string' ? current : undefined;
}

function interpolate(template: string, params?: TranslationParams): string {
	if (!params) return template;
	return template.replace(/\{(\w+)\}/g, (_, key) => {
		return key in params ? String(params[key]) : `{${key}}`;
	});
}

export class I18nStore {
	locale = $state<Locale>('en');

	constructor() {
		this.init();
	}

	init() {
		const saved = getStoredValue<string | null>(MODERN_STORAGE_KEY, LEGACY_STORAGE_KEY, null);
		if (saved === 'en' || saved === 'id') {
			this.locale = saved;
		}
	}

	setLocale(newLocale: Locale) {
		this.locale = newLocale;
		setStoredValue(MODERN_STORAGE_KEY, newLocale);
	}

	toggleLocale() {
		this.setLocale(this.locale === 'en' ? 'id' : 'en');
	}

	t(key: TranslationKey, params?: TranslationParams): string {
		const activeDict = (this.locale === 'id' ? id : en) as unknown as Record<string, unknown>;
		let raw = getNestedValue(activeDict, key);

		// Fallback to English if missing or empty
		if (!raw && this.locale !== 'en') {
			raw = getNestedValue(en as unknown as Record<string, unknown>, key);
		}

		if (!raw) {
			return key;
		}

		return interpolate(raw, params);
	}
}

export const i18nStore = new I18nStore();

export function t(key: TranslationKey, params?: TranslationParams): string {
	return i18nStore.t(key, params);
}
