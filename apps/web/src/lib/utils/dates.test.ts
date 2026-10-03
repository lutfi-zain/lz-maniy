import { describe, it, expect } from 'vitest';
import { buildLocalISO, hasNonMidnightTime, extractTimeHHmm, getPeriodDateBounds, formatPeriodTitle } from './dates';

describe('buildLocalISO', () => {
	it('assembles date + time with seconds :00 and a zone offset', () => {
		expect(buildLocalISO('2026-09-30', '14:30')).toMatch(/^2026-09-30T14:30:00[+-]\d{2}:\d{2}$/);
	});

	it('zero-pads single-digit hours and minutes', () => {
		expect(buildLocalISO('2026-09-30', '9:5')).toMatch(/^2026-09-30T09:05:00[+-]\d{2}:\d{2}$/);
	});

	it('uses the browser zone offset of the caller', () => {
		const offsetMin = new Date().getTimezoneOffset();
		const sign = offsetMin <= 0 ? '+' : '-';
		const abs = Math.abs(offsetMin);
		const off = `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
		expect(buildLocalISO('2026-09-30', '00:00').endsWith(off)).toBe(true);
	});
});

describe('hasNonMidnightTime', () => {
	it('returns true for datetimes with a non-midnight clock', () => {
		expect(hasNonMidnightTime('2026-09-30T14:30:00+07:00')).toBe(true);
		expect(hasNonMidnightTime('2026-09-30T00:01:00+07:00')).toBe(true);
	});

	it('returns false for midnight, date-only, and empty values', () => {
		expect(hasNonMidnightTime('2026-09-30T00:00:00+07:00')).toBe(false);
		expect(hasNonMidnightTime('2026-09-30')).toBe(false);
		expect(hasNonMidnightTime(null)).toBe(false);
		expect(hasNonMidnightTime(undefined)).toBe(false);
		expect(hasNonMidnightTime('')).toBe(false);
	});
});

describe('extractTimeHHmm', () => {
	it('extracts wall-clock digits verbatim', () => {
		expect(extractTimeHHmm('2026-09-25T12:00:00+07:00')).toBe('12:00');
		expect(extractTimeHHmm('2026-09-25T09:05:00Z')).toBe('09:05');
	});

	it('returns null for date-only, midnight-adjacent garbage, and empty values', () => {
		expect(extractTimeHHmm('2026-09-25')).toBeNull();
		expect(extractTimeHHmm(null)).toBeNull();
		expect(extractTimeHHmm(undefined)).toBeNull();
	});
});

describe('same-day ordering via full ISO strings', () => {
	it('sorts lexicographically by time within one calendar date', () => {
		const rows = [
			'2026-09-30T14:30:00+07:00',
			'2026-09-30T09:15:00+07:00',
			'2026-09-30T23:59:00+07:00'
		];
		expect([...rows].sort()).toEqual([
			'2026-09-30T09:15:00+07:00',
			'2026-09-30T14:30:00+07:00',
			'2026-09-30T23:59:00+07:00'
		]);
	});
});

describe('getPeriodDateBounds', () => {
	it('parses canonical YYYY-MM into correct month start and last day', () => {
		expect(getPeriodDateBounds('2026-10')).toEqual({
			startDate: '2026-10-01',
			endDate: '2026-10-31'
		});
		expect(getPeriodDateBounds('2026-02')).toEqual({
			startDate: '2026-02-01',
			endDate: '2026-02-28'
		});
	});

	it('parses custom date intervals YYYY-MM-DD_YYYY-MM-DD verbatim', () => {
		expect(getPeriodDateBounds('2026-09-25_2026-10-24')).toEqual({
			startDate: '2026-09-25',
			endDate: '2026-10-24'
		});
	});

	it('handles empty input gracefully', () => {
		expect(getPeriodDateBounds('')).toEqual({
			startDate: '',
			endDate: ''
		});
	});
});

describe('formatPeriodTitle', () => {
	it('formats whole month keys in localized format', () => {
		expect(formatPeriodTitle('2026-10', 'id')).toContain('Oktober 2026');
		expect(formatPeriodTitle('2026-10', 'en')).toContain('October 2026');
	});

	it('formats custom interval keys into a date range', () => {
		const idTitle = formatPeriodTitle('2026-09-25_2026-10-24', 'id');
		expect(idTitle).toContain('25 Sep 2026');
		expect(idTitle).toContain('24 Okt 2026');
	});
});
