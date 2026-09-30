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

/**
 * Builds a full local-offset ISO datetime from a calendar date and wall-clock time.
 * Example: ("2026-09-30", "14:30") -> "2026-09-30T14:30:00+07:00" (offset varies by browser zone).
 * Seconds are always `:00`. Pure string assembly except for the zone offset lookup.
 */
export function buildLocalISO(date: string, time: string): string {
	const [hh = '00', mm = '00'] = time.split(':');
	const offsetMin = new Date().getTimezoneOffset();
	const sign = offsetMin <= 0 ? '+' : '-';
	const abs = Math.abs(offsetMin);
	const offH = String(Math.floor(abs / 60)).padStart(2, '0');
	const offM = String(abs % 60).padStart(2, '0');
	return `${date}T${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:00${sign}${offH}:${offM}`;
}

/**
 * True when an ISO datetime carries a non-midnight time component.
 * Date-only strings and exactly-midnight timestamps return false (legacy data hides the clock).
 * String inspection on purpose: avoids timezone-shift false positives from `new Date()` parsing.
 */
export function hasNonMidnightTime(dateStr: string | null | undefined): boolean {
	if (!dateStr || dateStr.length <= 10) return false;
	const hm = dateStr.slice(11, 16);
	return /^\d{2}:\d{2}$/.test(hm) && hm !== '00:00';
}

/**
 * Extracts the wall-clock `HH:mm` from an ISO datetime via string surgery (no `Date` parsing,
 * so the stored digits survive verbatim across zones). Returns null for date-only values.
 */
export function extractTimeHHmm(dateStr: string | null | undefined): string | null {
	if (!dateStr || dateStr.length <= 10) return null;
	const hm = dateStr.slice(11, 16);
	return /^([01]\d|2[0-3]):[0-5]\d$/.test(hm) ? hm : null;
}
