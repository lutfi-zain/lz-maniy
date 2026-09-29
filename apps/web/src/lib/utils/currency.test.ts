import { describe, it, expect, beforeEach } from 'vitest';
import { fmtIDR, fmtCurrency, fmtCompactIDR, getConvertedBalanceInIDR } from './currency';
import { dFmt, mLabel } from './dates';
import { i18nStore } from '$lib/i18n/index.svelte';

describe('currency utils', () => {
	beforeEach(() => {
		i18nStore.setLocale('en');
	});

	it('formats whole number IDR amounts in English (default)', () => {
		expect(fmtIDR(12500000)).toBe('Rp 12,500,000');
		expect(fmtIDR(0)).toBe('Rp 0');
		expect(fmtIDR(null)).toBe('Rp 0');
	});

	it('formats whole number IDR amounts in Indonesian', () => {
		expect(fmtIDR(12500000, 'id')).toBe('Rp 12.500.000');
		expect(fmtIDR(0, 'id')).toBe('Rp 0');
		expect(fmtIDR(null, 'id')).toBe('Rp 0');
	});

	it('formats fractional IDR amounts with appropriate decimal separator', () => {
		expect(fmtIDR(17333190.67, 'en')).toBe('Rp 17,333,190.67');
		expect(fmtIDR(17333190.67, 'id')).toBe('Rp 17.333.190,67');
		expect(fmtIDR(0.12, 'en')).toBe('Rp 0.12');
		expect(fmtIDR(0.12, 'id')).toBe('Rp 0,12');
	});

	it('formats negative IDR amounts correctly', () => {
		const resEn = fmtIDR(-89780652, 'en');
		expect(resEn).toContain('-89,780,652');
		const resId = fmtIDR(-89780652, 'id');
		expect(resId).toContain('-89.780.652');
	});

	it('formats foreign currencies like USDT', () => {
		expect(fmtCurrency(115.61, 'USDT', 'en')).toBe('115.61 USDT');
		expect(fmtCurrency(115.61, 'USDT', 'id')).toBe('115,61 USDT');
		expect(fmtCurrency(500, 'USD', 'en')).toBe('500 USD');
		expect(fmtCurrency(10000, 'IDR', 'en')).toBe('Rp 10,000');
		expect(fmtCurrency(10000, 'IDR', 'id')).toBe('Rp 10.000');
	});

	it('formats compact IDR representations in English and Indonesian', () => {
		// English: M and B and K
		expect(fmtCompactIDR(5570000, 'en')).toBe('Rp 5.57M');
		expect(fmtCompactIDR(17330000, 'en')).toBe('Rp 17.33M');
		expect(fmtCompactIDR(1500000000, 'en')).toBe('Rp 1.5B');
		expect(fmtCompactIDR(250000, 'en')).toBe('Rp 250K');

		// Indonesian: jt and M and rb
		expect(fmtCompactIDR(5570000, 'id')).toBe('Rp 5,57 jt');
		expect(fmtCompactIDR(17330000, 'id')).toBe('Rp 17,33 jt');
		expect(fmtCompactIDR(1500000000, 'id')).toBe('Rp 1,5 M');
		expect(fmtCompactIDR(250000, 'id')).toBe('Rp 250 rb');
	});

	it('converts foreign currencies to IDR accurately', () => {
		expect(getConvertedBalanceInIDR(100000, 'IDR')).toBe(100000);
		const usdtVal = getConvertedBalanceInIDR(115.61, 'USDT');
		expect(usdtVal).toBeCloseTo(2061999.82, 0);
		expect(getConvertedBalanceInIDR(100, 'USD', { USD: 16000 })).toBe(1600000);
	});
});

describe('date utils', () => {
	it('formats dates consistently based on locale', () => {
		const formattedEn = dFmt('2026-09-22T10:00:00+07:00', 'en');
		expect(formattedEn).toContain('2026');
		expect(formattedEn).toContain('Sep');

		const formattedId = dFmt('2026-09-22T10:00:00+07:00', 'id');
		expect(formattedId).toContain('2026');
		expect(formattedId).toContain('Sep');

		expect(dFmt(null)).toBe('—');
	});

	it('formats year-month key into month name', () => {
		expect(mLabel('2026-09', 'en')).toContain('September');
		expect(mLabel('2026-09', 'id')).toContain('September');
	});
});
