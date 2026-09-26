import { test, expect } from '@playwright/test';

test.describe('Ledger Studio Dual-Layer Summary Strip', () => {
	test('renders localized filter scope and global net worth anchor', async ({ page }) => {
		await page.goto('/ledger');

		// Left Zone: Filtered metrics
		await expect(page.locator('text=dalam filter aktif').first()).toBeVisible();
		await expect(page.locator('text=Masuk:').first()).toBeVisible();
		await expect(page.locator('text=Keluar:').first()).toBeVisible();
		await expect(page.locator('text=Net Terfilter:').first()).toBeVisible();

		// Right Zone: Present horizon on default "Bulan Ini"
		await expect(page.locator('text=NET WORTH SAAT INI').first()).toBeVisible();
		await expect(page.locator('text=posisi likuiditas terkonsolidasi').first()).toBeVisible();

		// Switch to "Bulan Depan"
		const datePickerTrigger = page.locator('button:has-text("Bulan Ini")').first();
		await datePickerTrigger.click();

		const bulanDepanBtn = page.getByRole('button', { name: 'Bulan Depan' });
		await expect(bulanDepanBtn).toBeVisible();
		await bulanDepanBtn.click();

		// Right Zone should now display PROYEKSI NET WORTH
		await expect(page.locator('text=PROYEKSI NET WORTH').first()).toBeVisible();
		await expect(page.locator('text=pasca seluruh rencana').first()).toBeVisible();

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
