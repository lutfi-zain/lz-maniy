import { describe, it, expect } from 'vitest';
import { fmtIDR, fmtCurrency, fmtCompactIDR } from './currency';
import { dFmt, mLabel } from './dates';

describe('currency utils', () => {
	it('formats whole number IDR amounts with dot separators', () => {
		expect(fmtIDR(12500000)).toBe('Rp 12.500.000');
		expect(fmtIDR(0)).toBe('Rp 0');
		expect(fmtIDR(null)).toBe('Rp 0');
	});

	it('formats fractional IDR amounts with comma separator', () => {
		expect(fmtIDR(17333190.67)).toBe('Rp 17.333.190,67');
		expect(fmtIDR(0.12)).toBe('Rp 0,12');
	});

	it('formats negative IDR amounts correctly', () => {
		const res = fmtIDR(-89780652);
		expect(res).toContain('-89.780.652');
	});

	it('formats foreign currencies like USDT', () => {
		expect(fmtCurrency(115.61, 'USDT')).toBe('115,61 USDT');
		expect(fmtCurrency(500, 'USD')).toBe('500 USD');
		expect(fmtCurrency(10000, 'IDR')).toBe('Rp 10.000');
	});

	it('formats compact IDR representations', () => {
		expect(fmtCompactIDR(5570000)).toBe('Rp 5,57 jt');
		expect(fmtCompactIDR(17330000)).toBe('Rp 17,33 jt');
		expect(fmtCompactIDR(1500000000)).toBe('Rp 1,5 M');
	});
});

describe('date utils', () => {
	it('formats dates consistently', () => {
		const formatted = dFmt('2026-09-22T10:00:00+07:00');
		expect(formatted).toContain('2026');
		expect(dFmt(null)).toBe('—');
	});

	it('formats year-month key into month name', () => {
		expect(mLabel('2026-09')).toContain('2026');
	});
});
