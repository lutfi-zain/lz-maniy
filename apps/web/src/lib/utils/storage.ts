/**
 * Zero-data-loss LocalStorage Migration Helper.
 * Reads the modern single-y key first (`maniy_*`), falls back to legacy (`maniyy_*`),
 * seamlessly copies the value over to modern storage, and returns the parsed value.
 */

export function getStoredValue<T>(newKey: string, legacyKey: string, fallback: T): T {
	if (typeof localStorage === 'undefined') return fallback;

	try {
		const modernVal = localStorage.getItem(newKey);
		if (modernVal !== null) {
			try {
				return JSON.parse(modernVal) as T;
			} catch {
				return modernVal as unknown as T;
			}
		}

		const legacyVal = localStorage.getItem(legacyKey);
		if (legacyVal !== null) {
			// Migrate legacy value to modern storage immediately
			try {
				localStorage.setItem(newKey, legacyVal);
			} catch {
				// Quota or private browsing ignore
			}

			try {
				return JSON.parse(legacyVal) as T;
			} catch {
				return legacyVal as unknown as T;
			}
		}
	} catch {
		// Browser storage error fallback
	}

	return fallback;
}

export function setStoredValue<T>(key: string, value: T): void {
	if (typeof localStorage === 'undefined') return;

	try {
		const serialized = typeof value === 'string' ? value : JSON.stringify(value);
		localStorage.setItem(key, serialized);
	} catch {
		// QuotaExceededError or private browsing
	}
}

export function removeStoredValue(key: string, legacyKey?: string): void {
	if (typeof localStorage === 'undefined') return;

	try {
		localStorage.removeItem(key);
		if (legacyKey) {
			localStorage.removeItem(legacyKey);
		}
	} catch {
		// ignore
	}
}
