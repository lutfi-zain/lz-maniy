import { test, expect } from '@playwright/test';

const TEST_TOKEN = '$REEDRICH_TEST_API_TOKEN';
const TEST_USER = JSON.stringify({
	userId: 'usr_muhwbsfe_722e117da986448e',
	email: 'testbot@maniyy.dev',
	fullName: 'Maniyy TestBot'
});

test.describe('Server-Driven Horizon Wallets and Cockpit UX', () => {
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

	test('Cockpit recent transactions query includes status=realized, orderBy=date, direction=desc', async ({
		page
	}) => {
		let recentTxUrl = '';

		page.on('request', (req) => {
			if (req.url().includes('/api/v1/transactions') && req.url().includes('limit=30')) {
				recentTxUrl = req.url();
			}
		});

		await page.goto('/');
		await page.waitForLoadState('networkidle');

		expect(recentTxUrl).toContain('status=realized');
		expect(recentTxUrl).toContain('orderBy=date');
		expect(recentTxUrl).toContain('direction=desc');
		expect(recentTxUrl).toContain('limit=30');
	});

	test('Accounts page queries server-driven point-in-time wallets on date filter change', async ({
		page
	}) => {
		const walletRequests: string[] = [];

		page.on('request', (req) => {
			if (req.url().includes('/api/v1/wallets')) {
				walletRequests.push(req.url());
			}
		});

		await page.goto('/accounts');
		await page.waitForLoadState('networkidle');

		// Initial wallets fetch
		expect(walletRequests.length).toBeGreaterThanOrEqual(1);

		// Switch date range preset to 'last_month'
		const presetButton = page.locator('button', { hasText: /Bulan Lalu|Last Month/i }).first();
		if (await presetButton.isVisible()) {
			await presetButton.click();
			await page.waitForLoadState('networkidle');

			// Should have triggered a new wallets request with startDate and endDate
			const lastReq = walletRequests[walletRequests.length - 1];
			expect(lastReq).toContain('startDate=');
			expect(lastReq).toContain('endDate=');
		}
	});
	test('Clicking bank in Cockpit bank widget opens wallet drawer without navigating to ledger', async ({
		page
	}) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Select wallet row inside Bank Widget
		const bankWidgetAccount = page
			.locator('div:has(> h3:has-text("Accounts & Banking")) button')
			.filter({ hasText: /BCA|Jago|Cash|Mandiri|Bank|Bitget|Main|Private/i })
			.first();

		if (await bankWidgetAccount.isVisible()) {
			await bankWidgetAccount.click();
			// Ensure drilldown drawer with id="drawer-title" is visible
			const drawerTitle = page.locator('#drawer-title');
			await expect(drawerTitle).toBeVisible({ timeout: 5000 });
			// Ensure we remain on the cockpit / page
			expect(page.url()).not.toContain('/ledger');
		}
	});
});
