import { test, expect } from '@playwright/test';

const TEST_TOKEN =
	process.env.REEDRICH_TEST_API_TOKEN ||
	process.env.TEST_TOKEN ||
	'';
const TEST_USER = JSON.stringify({
	userId: process.env.REEDRICH_TEST_USER_ID || 'usr_muhwbsfe_722e117da986448e',
	email: process.env.REEDRICH_TEST_USER_EMAIL || 'testbot@maniyy.dev',
	fullName: 'Maniyy TestBot'
});

test.describe('Ledger Studio Dual-Layer Summary Strip', () => {
	test.beforeEach(async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await page.addInitScript(
			({ token, user }) => {
				localStorage.setItem('reedrich_access_token', token);
				localStorage.setItem('reedrich_user', user);
				localStorage.setItem('reedrich_locale', 'id');
				localStorage.setItem('maniyy_locale', 'id');
				localStorage.setItem('maniyy_user_settings', JSON.stringify({ ledgerViewMode: 'single', activePeriods: [] }));
			},
			{ token: TEST_TOKEN, user: TEST_USER }
		);
		await page.route('**/api/settings', (route) => route.fulfill({ status: 200, json: {} }));
	});

	test('renders localized filter scope and global net worth anchor', async ({ page }) => {
		await page.goto('/ledger');
		// Ensure in List view
		const listBtn = page.locator('button[title="Tampilan List / Tabel"]').first();
		await expect(listBtn).toBeVisible({ timeout: 10000 });
		await listBtn.click();

		// Left Zone: Filtered metrics
		await expect(page.locator('text=dalam filter aktif').first()).toBeVisible();
		await expect(page.locator('text=Masuk:').first()).toBeVisible();
		await expect(page.locator('text=Keluar:').first()).toBeVisible();
		await expect(page.locator('text=Net Terfilter:').first()).toBeVisible();

		// Right Zone: Present horizon on default "Bulan Ini"
		await expect(page.locator('text=NET WORTH SAAT INI').first()).toBeVisible();
		await expect(page.locator('text=posisi likuiditas terkonsolidasi').first()).toBeVisible();
		const presentAmount = await page.locator('.font-mono.text-base.font-bold').first().innerText();
		expect(presentAmount).toMatch(/^Rp\s+[\d.,]+/);
		await page.waitForLoadState('networkidle');

		// Switch to "Bulan Depan"
		const datePickerTrigger = page.locator('button:has-text("Bulan Ini")').first();
		await datePickerTrigger.click();

		const bulanDepanBtn = page.getByRole('button', { name: 'Bulan Depan' });
		await expect(bulanDepanBtn).toBeVisible({ timeout: 10000 });
		await bulanDepanBtn.click();

		// Right Zone should now display PROYEKSI NET WORTH
		await expect(page.locator('text=PROYEKSI NET WORTH').first()).toBeVisible();
		await expect(page.locator('text=pasca seluruh rencana').first()).toBeVisible();
		const futureAmount = await page.locator('.font-mono.text-base.font-bold').first().innerText();
		expect(futureAmount).toMatch(/^Rp\s+[\d.,]+/);
		// Test Filter Narrowing Invariance:
		// Type search query "KFC" to filter transactions
		const searchInput = page.locator('#ledgerSearch');
		await searchInput.fill('KFC');

		// Right zone should STILL display PROYEKSI NET WORTH with full portfolio projection
		await expect(page.locator('text=PROYEKSI NET WORTH').first()).toBeVisible();
		await expect(page.locator('text=pasca seluruh rencana').first()).toBeVisible();
	});

	test('renders cleanly on mobile viewport', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto('/ledger');

		// Both zones should be visible in stacked presentation
		await expect(page.locator('text=dalam filter aktif').first()).toBeVisible();
		await expect(page.locator('text=NET WORTH SAAT INI').first()).toBeVisible();
	});
});
