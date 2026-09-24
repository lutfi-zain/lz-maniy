import { test, expect } from '@playwright/test';

test.describe('Responsive Viewports & Touch Experience', () => {
	test.use({ viewport: { width: 375, height: 667 } });

	test('renders cleanly on mobile viewport without horizontal overflow', async ({ page }) => {
		await page.goto('/');

		// Check heading renders
		const heading = page.locator('h1');
		await expect(heading).toBeVisible();

		// Check body width matches viewport width
		const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
		expect(bodyWidth).toBeLessThanOrEqual(375);

		// Click a wallet card on mobile
		const walletCard = page.locator('#sec-wallets').getByText('BCA Main').first();
		await walletCard.click();

		// Drawer should be full width on mobile
		const drawer = page.locator('div[role="dialog"]');
		await expect(drawer).toBeVisible();

		// Dismiss via close button
		const closeBtn = drawer.locator('button:has-text("ESC")');
		await closeBtn.click();
		await expect(drawer).not.toBeVisible();
	});
});
