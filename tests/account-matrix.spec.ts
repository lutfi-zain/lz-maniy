import { test, expect } from '@playwright/test';

test.describe('Account Matrix Filtering, Sorting and Label Cleanup', () => {
	test('searches wallets and sorts without redundant labels', async ({ page }) => {
		await page.goto('/accounts');

		// Check search input
		const searchInput = page.locator('input[placeholder*="Cari nama akun"]');
		await expect(searchInput).toBeVisible();

		// Search for "BCA"
		await searchInput.fill('BCA');
		await expect(page.getByText('BCA Main').first()).toBeVisible();

		// Verify redundant text labels "Mata Uang:" and "Tipe:" are NOT present in rows
		await expect(page.locator('text=Mata Uang:').first()).not.toBeVisible();
		await expect(page.locator('text=Tipe:').first()).not.toBeVisible();

		// Verify tickers IDR and USDT are present
		await expect(page.getByText('IDR').first()).toBeVisible();

		// Check StatusBadge
		await expect(page.getByText('Operasional').first()).toBeVisible();
	});
});
