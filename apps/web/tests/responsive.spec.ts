import { test, expect } from '@playwright/test';

test.describe('Responsive Viewports & Touch Experience', () => {
	test.use({ viewport: { width: 375, height: 667 } });

	test('renders cockpit cleanly on mobile without horizontal overflow', async ({ page }) => {
		await page.goto('/');

		// Check header brand
		const brand = page.locator('header');
		await expect(brand).toBeVisible();

		// Check body width matches viewport width
		const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
		expect(bodyWidth).toBeLessThanOrEqual(375);

		// Check KPI cards render
		await expect(page.locator('#kpis')).toBeVisible();
	});

	test('renders ledger cleanly on mobile', async ({ page }) => {
		await page.goto('/ledger');

		// Check studio heading
		const heading = page.locator('h1');
		await expect(heading).toContainText('Ledger Studio');

		// Check search input is accessible
		const search = page.locator('#ledgerSearch');
		await expect(search).toBeVisible();
	});
});
