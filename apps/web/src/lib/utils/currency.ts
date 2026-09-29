import { i18nStore } from '$lib/i18n/index.svelte';
import type { Locale } from '$lib/i18n/types';

/**
 * Default live peg rate: 1 USDT ≈ 17,835.8258 IDR (computed from Bitget USDT 115.61 -> Rp 2.061.999,82)
 */
export const DEFAULT_USDT_TO_IDR_RATE = 17835.8258;

/**
 * Converts any currency balance to IDR using live peg or snapshot rates.
 */
export function getConvertedBalanceInIDR(
	balance: number | null | undefined,
	currency: string = 'IDR',
	customRates?: Record<string, number>
): number {
	const n = Number(balance || 0);
	const c = String(currency || 'IDR').toUpperCase();
	if (c === 'IDR') return n;
	const rate = customRates?.[c] ?? (c === 'USDT' || c === 'USD' ? DEFAULT_USDT_TO_IDR_RATE : 1);
	return n * rate;
}

/**
 * Formats a numeric amount into Indonesian Rupiah (IDR) currency format.
 * Examples (en):
 *   12500000 -> "Rp 12,500,000"
 *   17333190.67 -> "Rp 17,333,190.67"
 * Examples (id):
 *   12500000 -> "Rp 12.500.000"
 *   17333190.67 -> "Rp 17.333.190,67"
 */
export function fmtIDR(amount: number | null | undefined, locale?: Locale): string {
	const n = Number(amount || 0);
	const loc = locale || i18nStore.locale || 'en';
	const intlLocale = loc === 'id' ? 'id-ID' : 'en-US';

	return (
		'Rp ' +
		n.toLocaleString(intlLocale, {
			minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
			maximumFractionDigits: 2
		})
	);
}

/**
 * Currency-aware formatting supporting IDR and secondary currencies like USDT.
 */
export function fmtCurrency(
	amount: number | null | undefined,
	currency: string = 'IDR',
	locale?: Locale
): string {
	const c = String(currency || 'IDR').toUpperCase();
	if (c === 'IDR') {
		return fmtIDR(amount, locale);
	}
	const n = Number(amount || 0);
	const loc = locale || i18nStore.locale || 'en';
	const intlLocale = loc === 'id' ? 'id-ID' : 'en-US';

	return n.toLocaleString(intlLocale, { maximumFractionDigits: 2 }) + ' ' + c;
}

/**
 * Formats compact Indonesian Rupiah.
 * In English: Rp 5.5M, Rp 250K, Rp 1.2B.
 * In Indonesian: Rp 5,5 jt, Rp 250 rb, Rp 1,2 M.
 */
export function fmtCompactIDR(amount: number | null | undefined, locale?: Locale): string {
	const n = Number(amount || 0);
	const abs = Math.abs(n);
	const sign = n < 0 ? '−' : '';
	const loc = locale || i18nStore.locale || 'en';
	const intlLocale = loc === 'id' ? 'id-ID' : 'en-US';

	if (loc === 'en') {
		if (abs >= 1_000_000_000) {
			return `${sign}Rp ${(abs / 1_000_000_000).toLocaleString(intlLocale, { maximumFractionDigits: 2 })}B`;
		}
		if (abs >= 1_000_000) {
			return `${sign}Rp ${(abs / 1_000_000).toLocaleString(intlLocale, { maximumFractionDigits: 2 })}M`;
		}
		if (abs >= 1_000) {
			return `${sign}Rp ${(abs / 1_000).toLocaleString(intlLocale, { maximumFractionDigits: 1 })}K`;
		}
		return fmtIDR(n, 'en');
	}

	// Indonesian fallback
	if (abs >= 1_000_000_000) {
		return `${sign}Rp ${(abs / 1_000_000_000).toLocaleString(intlLocale, { maximumFractionDigits: 2 })} M`;
	}
	if (abs >= 1_000_000) {
		return `${sign}Rp ${(abs / 1_000_000).toLocaleString(intlLocale, { maximumFractionDigits: 2 })} jt`;
	}
	if (abs >= 1_000) {
		return `${sign}Rp ${(abs / 1_000).toLocaleString(intlLocale, { maximumFractionDigits: 1 })} rb`;
	}
	return fmtIDR(n, 'id');
}
