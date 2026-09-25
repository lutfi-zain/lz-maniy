import { test, expect } from '@playwright/test';

test.describe('Account to Ledger 1-Click Drilldown', () => {
	test('navigates from account card to filtered ledger view', async ({ page }) => {
		await page.goto('/accounts');

		// Click first wallet card directly
		const walletCard = page.locator('a[href*="/ledger?walletId="]').first();
		await expect(walletCard).toBeVisible();
		await walletCard.click();

		// Should navigate to ledger with walletId parameter
		await expect(page).toHaveURL(/\/ledger\?walletId=/);
		await expect(page.locator('h1')).toContainText('Ledger Studio');
	});
});
