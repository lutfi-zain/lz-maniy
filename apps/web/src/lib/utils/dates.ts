import { i18nStore } from '$lib/i18n/index.svelte';
import type { Locale } from '$lib/i18n/types';

/**
 * Formats an ISO date string into day, short month, year format based on active locale.
 * Example (en): "2026-09-22T10:00:00+07:00" -> "Sep 22, 2026"
 * Example (id): "2026-09-22T10:00:00+07:00" -> "22 Sep 2026"
 */
export function dFmt(dateStr: string | null | undefined, locale?: Locale): string {
	if (!dateStr) return '—';
	try {
		const loc = locale || i18nStore.locale || 'en';
		const intlLocale = loc === 'id' ? 'id-ID' : 'en-US';
		return new Date(dateStr).toLocaleDateString(intlLocale, {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	} catch {
		return String(dateStr);
	}
}

/**
 * Formats an ISO date string with time in localized format.
 * Example (en): "2026-09-22T10:00:00+07:00" -> "Sep 22, 2026, 10:00 AM"
 * Example (id): "2026-09-22T10:00:00+07:00" -> "22 Sep 2026, 10.00"
 */
export function dFmtTime(dateStr: string | null | undefined, locale?: Locale): string {
	if (!dateStr) return '—';
	try {
		const loc = locale || i18nStore.locale || 'en';
		const intlLocale = loc === 'id' ? 'id-ID' : 'en-US';
		return new Date(dateStr).toLocaleDateString(intlLocale, {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	} catch {
		return String(dateStr);
	}
}

/**
 * Formats a year-month key ("2026-09") into localized month name and year ("September 2026").
 */
export function mLabel(monthKey: string | null | undefined, locale?: Locale): string {
	if (!monthKey) return '—';
	try {
		const parts = monthKey.split('-');
		const d = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
		const loc = locale || i18nStore.locale || 'en';
		const intlLocale = loc === 'id' ? 'id-ID' : 'en-US';
		return d.toLocaleDateString(intlLocale, { month: 'long', year: 'numeric' });
	} catch {
		return String(monthKey);
	}
}
