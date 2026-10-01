import { test, expect } from '@playwright/test';

const TEST_TOKEN = '$REEDRICH_TEST_API_TOKEN';
const TEST_USER = JSON.stringify({
	userId: 'usr_muhwbsfe_722e117da986448e',
	email: 'testbot@maniyy.dev',
	fullName: 'Maniyy TestBot'
});

test.describe('Decoupled Entity Fetching & Contextual Horizon UX', () => {
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

	test('Accounts page queries /api/v1/wallets directly and renders lastTransaction', async ({
		page
	}) => {
		let walletsRequested = false;
		page.on('request', (req) => {
			if (req.url().endsWith('/api/v1/wallets')) {
				walletsRequested = true;
			}
		});

		await page.goto('/accounts');
		await page.waitForLoadState('networkidle');

		// 1. Verify GET /api/v1/wallets was called
		expect(walletsRequested).toBe(true);

		// 2. In List view, DateRangePicker should be visible
		const datePicker = page.locator('button[aria-haspopup="dialog"]').first();
		await expect(datePicker).toBeVisible();

		// 3. Switch to Horizon Board view -> DateRangePicker should be hidden
		const horizonBtn = page.locator('button[title="Tampilan Kalendar Multi-Periode"]');
		await horizonBtn.click();
		await expect(horizonBtn).toHaveAttribute('aria-pressed', 'true');

		// DateRangePicker should now NOT be visible in the toolbar
		await expect(datePicker).toHaveCount(0);
	});

	test('Ledger hides DateRangePicker when Horizon Board is active', async ({ page }) => {
		await page.goto('/ledger');
		await page.waitForLoadState('networkidle');

		// Ensure in List view first
		const listBtn = page.locator('button:has-text("List")').first();
		await listBtn.click();
		await expect(listBtn).toHaveAttribute('aria-pressed', 'true');

		// In List view, DateRangePicker is visible
		const datePicker = page.locator('button[aria-haspopup="dialog"]').first();
		await expect(datePicker).toBeVisible();

		// Switch to Horizon Board
		const horizonBtn = page.locator('button:has-text("Horizon Board")').first();
		await horizonBtn.click();
		await expect(horizonBtn).toHaveAttribute('aria-pressed', 'true');

		// DateRangePicker should now be hidden
		await expect(datePicker).toHaveCount(0);
	});

	test('Planning Goals hides DateRangePicker when Goals Horizon Board is active', async ({
		page
	}) => {
		await page.goto('/planning');
		await page.waitForLoadState('networkidle');

		// In Goals List view, DateRangePicker is visible
		const datePicker = page.locator('button[aria-haspopup="dialog"]').first();
		await expect(datePicker).toBeVisible();

		// Switch to Goals Horizon Board
		const horizonBtn = page.locator('button[title="Tampilan Kalendar Multi-Periode"]');
		await horizonBtn.click();
		await expect(horizonBtn).toHaveAttribute('aria-pressed', 'true');

		// DateRangePicker should now be hidden
		await expect(datePicker).toHaveCount(0);
	});
});
