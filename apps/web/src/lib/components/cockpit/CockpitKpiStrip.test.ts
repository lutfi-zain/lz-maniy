import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'svelte/server';
import CockpitKpiStrip from './CockpitKpiStrip.svelte';
import CockpitAlertBanner from './CockpitAlertBanner.svelte';
import { reedrichStore } from '$lib/stores/reedrich.svelte';
import { MOCK_SUMMARY } from '$lib/stores/mock-data';
import { fmtIDR } from '$lib/utils/currency';

describe('Cockpit KPI Strip & Alert Banner', () => {
	beforeEach(() => {
		reedrichStore.loadMock();
	});

	it('renders net worth and positive safe to spend runway correctly', () => {
		const result = render(CockpitKpiStrip);
		expect(result.body).toContain(fmtIDR(4500000));
		expect(result.body).toContain(fmtIDR(375000));
		expect(result.body).toContain('/hari');
	});

	it('renders deficit styling and alert banner when safe-to-spend is negative', async () => {
		reedrichStore.summary = {
			...MOCK_SUMMARY,
			safeToSpend: -1034701565,
			dailySafeToSpend: -33377469,
			safeToSpendDetails: {
				remainingDays: 31,
				plannedExpensesDeducted: 1028275115,
				recurringExpensesDeducted: 0,
				activeDebtDeducted: 6645000,
				isDeficit: true
			}
		};
		const kpi = render(CockpitKpiStrip);
		expect(kpi.body).toContain('Defisit');
		expect(kpi.body).toContain(fmtIDR(-1034701565));

		const alert = render(CockpitAlertBanner);
		expect(alert.body).toContain('Peringatan Runway Defisit:');
		expect(alert.body).toContain(fmtIDR(-1034701565));
	});
});
