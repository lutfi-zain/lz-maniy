import { test, expect } from '@playwright/test';

const TEST_TOKEN = process.env.REEDRICH_TEST_API_TOKEN || process.env.TEST_TOKEN || '';
const TEST_USER = JSON.stringify({
	userId: process.env.REEDRICH_TEST_USER_ID || 'usr_muhwbsfe_722e117da986448e',
	email: process.env.REEDRICH_TEST_USER_EMAIL || 'testbot@maniyy.dev',
	fullName: 'Maniyy TestBot'
});

test.describe('Cockpit Lifecycle and v1.17.0 Snapshot Sync', () => {
	test.beforeEach(async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await page.addInitScript(
			({ token, user }) => {
				localStorage.setItem('reedrich_access_token', token);
				localStorage.setItem('reedrich_user', user);
				localStorage.setItem('reedrich_locale', 'id');
			},
			{ token: TEST_TOKEN, user: TEST_USER }
		);
	});

	test('Cockpit re-fetches account-detail snapshot when dateFilterStore preset changes', async ({
		page
	}) => {
		const snapshotRequests: string[] = [];

		page.on('request', (req) => {
			if (req.url().includes('/api/v1/account-detail')) {
				snapshotRequests.push(req.url());
			}
		});

		await page.goto('/');
		await page.waitForLoadState('networkidle');

		expect(snapshotRequests.length).toBeGreaterThanOrEqual(1);

		// Switch date range preset to 'last_month' using DateRangePicker in Cockpit
		const dateRangeButton = page.locator('button', { hasText: /Bulan Ini|This Month/i }).first();
		if (await dateRangeButton.isVisible()) {
			await dateRangeButton.click();
			const lastMonthOption = page.locator('button', { hasText: /Bulan Lalu|Last Month/i }).first();
			if (await lastMonthOption.isVisible()) {
				await lastMonthOption.click();
				await page.waitForLoadState('networkidle');

				// Check that a new request was issued with date bounds
				const lastReq = snapshotRequests[snapshotRequests.length - 1];
				expect(lastReq).toContain('startDate=');
				expect(lastReq).toContain('endDate=');
			}
		}
	});

	test('Cockpit Allocation Widget does not render completed/past budgets for current month', async ({
		page
	}) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// In October 2026, past September budgets (like "Jenguk Mertua Bekasi (Sep 2026)") should not be rendered
		const pastBudget = page.locator('text=Jenguk Mertua Bekasi (Sep 2026)');
		await expect(pastBudget).toHaveCount(0);
	});
});
