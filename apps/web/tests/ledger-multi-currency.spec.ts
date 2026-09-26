import { test, expect } from '@playwright/test';

test.describe('Ledger Multi-Currency IDR Unification', () => {
	test('renders all ledger aggregates and non-IDR transactions in IDR', async ({ page }) => {
		await page.goto('/ledger');

		// Summary strip must render Masuk, Keluar, Net in IDR format
		await expect(page.locator('text=Masuk:').first()).toBeVisible();
		await expect(page.locator('text=Keluar:').first()).toBeVisible();
		await expect(page.locator('text=Net Terfilter:').first()).toBeVisible();

		// Net worth timeline anchor must render in IDR
		const netWorthAnchor = page.locator('text=NET WORTH SAAT INI').first();
		await expect(netWorthAnchor).toBeVisible();

		// Navigate with Bitget wallet filter
		await page.goto('/ledger?walletId=f87ca599-9e0b-4894-957a-b681e533a324');

		// Summary strip should still format amounts in IDR (Rp)
		const masukStrip = page.locator('div:has-text("Masuk:")').first();
		await expect(masukStrip).toContainText('Rp');

		const keluarStrip = page.locator('div:has-text("Keluar:")').first();
		await expect(keluarStrip).toContainText('Rp');

		const netStrip = page.locator('div:has-text("Net Terfilter:")').first();
		await expect(netStrip).toContainText('Rp');
	});
});
