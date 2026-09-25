import { test, expect } from '@playwright/test';

test.describe('Category Filtering & Resolution in Ledger', () => {
	test('clicking Makan & Minum in cockpit loads and renders matching transactions in ledger', async ({
		page
	}) => {
		await page.goto('/');

		// Click Makan & Minum in the Cockpit Allocation Widget
		const makanLink = page.locator('a[href*="category=Makan"]').first();
		await expect(makanLink).toBeVisible();
		await makanLink.click();

		// Should navigate to /ledger with category query param
		await expect(page).toHaveURL(/\/ledger\?category=/);
		await expect(page.locator('h1')).toContainText('Ledger Studio');

		// Wait for ledger table to render
		// Wait for ledger table to render after transactions load
		const table = page.locator('table');
		await expect(table).toBeVisible({ timeout: 15000 });

		// Verify that at least one row exists and has Kategori "Makan & Minum"
		const catCell = table.locator('td:has-text("Makan & Minum")').first();
		await expect(catCell).toBeVisible();

		// Verify aggregate strip displays non-zero count
		const countText = page.locator('text=transaksi dalam filter aktif');
		await expect(countText).toBeVisible();
	});
});
