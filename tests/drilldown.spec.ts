import { test, expect } from '@playwright/test';

test.describe('Account to Ledger 1-Click Drilldown', () => {
	test('navigates from account card to filtered ledger view', async ({ page }) => {
		await page.goto('/accounts');

		// Click "Lihat Mutasi" on the first wallet card
		const mutasiBtn = page.locator('a:has-text("Lihat Mutasi")').first();
		await expect(mutasiBtn).toBeVisible();
		await mutasiBtn.click();

		// Should navigate to ledger with walletId parameter
		await expect(page).toHaveURL(/\/ledger\?walletId=/);
		await expect(page.locator('h1')).toContainText('Ledger Studio');
	});
});
