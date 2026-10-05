import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'svelte/server';
import PeriodSummaryCard, { type PeriodSummary } from './PeriodSummaryCard.svelte';
import { i18nStore } from '$lib/i18n/index.svelte';

describe('PeriodSummaryCard Component', () => {
	beforeEach(() => {
		i18nStore.setLocale('id');
	});

	const summaryWithPartition: PeriodSummary = {
		periodKey: '2026-10',
		startDate: '2026-10-01',
		endDate: '2026-10-31',
		income: 20475000,
		expense: 11503300,
		net: 8971700,
		netSpendable: 1971700,
		netLocked: 7000000,
		closingNetWorth: 23965617,
		spendable: 1947265,
		locked: 22018352,
		goalSnapshots: [],
		label: 'PROYEKSI AKHIR BULAN'
	};

	const summaryWithoutPartition: PeriodSummary = {
		periodKey: '2026-10',
		startDate: '2026-10-01',
		endDate: '2026-10-31',
		income: 10000000,
		expense: 6000000,
		net: 4000000,
		closingNetWorth: 15000000,
		spendable: 5000000,
		locked: 10000000,
		goalSnapshots: [],
		label: 'PROYEKSI NET WORTH'
	};

	it('renders cashflow decomposition rows when netSpendable and netLocked are present', () => {
		const result = render(PeriodSummaryCard, {
			props: { summary: summaryWithPartition }
		});

		// Net Cashflow
		expect(result.body).toContain('8.971.700');
		// Inflow and Outflow
		expect(result.body).toContain('20.475.000');
		expect(result.body).toContain('11.503.300');
		// Decomposition labels
		expect(result.body).toContain('Net Operasional');
		expect(result.body).toContain('Net Cadangan');
		// Decomposition values
		expect(result.body).toContain('1.971.700');
		expect(result.body).toContain('7.000.000');
		// Dot indicators
		expect(result.body).toContain('bg-[#346538]');
		expect(result.body).toContain('bg-[#956400]');
	});

	it('omits cashflow decomposition rows when netSpendable or netLocked are undefined', () => {
		const result = render(PeriodSummaryCard, {
			props: { summary: summaryWithoutPartition }
		});

		// Inflow, Outflow, Net are present
		expect(result.body).toContain('10.000.000');
		expect(result.body).toContain('6.000.000');
		expect(result.body).toContain('4.000.000');
		// Decomposition labels must NOT be present
		expect(result.body).not.toContain('Net Operasional');
		expect(result.body).not.toContain('Net Cadangan');
	});

	it('renders temporal label correctly according to summary.label', () => {
		const monthEndResult = render(PeriodSummaryCard, {
			props: { summary: summaryWithPartition }
		});
		expect(monthEndResult.body).toContain('Proyeksi Akhir Bulan');

		const projectedResult = render(PeriodSummaryCard, {
			props: { summary: summaryWithoutPartition }
		});
		expect(projectedResult.body).toContain('Proyeksi Net Worth');

		const closingSummary: PeriodSummary = {
			...summaryWithoutPartition,
			label: 'NET WORTH PENUTUPAN'
		};
		const closingResult = render(PeriodSummaryCard, {
			props: { summary: closingSummary }
		});
		expect(closingResult.body).toContain('Net Worth Penutupan');
	});

	it('renders skeleton state when summary is undefined or closingNetWorth is missing', () => {
		const result = render(PeriodSummaryCard, {
			props: { summary: undefined as unknown as PeriodSummary }
		});
		expect(result.body).toBeDefined();
		expect(result.body).not.toContain('Net Operasional');
	});
});
