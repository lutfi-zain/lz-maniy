import { test, expect } from '@playwright/test';

test.describe('Dashboard Initial Render & Cockpit KPIs', () => {
	test('renders document title and brand heading', async ({ page }) => {
		await page.goto('/');

		await expect(page).toHaveTitle(/Maniy/);
		const brand = page.locator('header');
		await expect(brand).toContainText('Maniy');
	});

	test('renders macro KPI values in Cockpit', async ({ page }) => {
		await page.goto('/');

		// Net worth card
		await expect(page.getByText('Net Worth')).toBeVisible();
		await expect(page.getByText('Safe to Spend')).toBeVisible();
		await expect(page.getByText('Committed Funds')).toBeVisible();
	});

	test('displays bank widgets and recent feed in workbench', async ({ page }) => {
		await page.goto('/');

		// Bank widget
		await expect(page.getByText('Balance by Institution')).toBeVisible();
		await expect(page.getByText('BCA', { exact: true }).first()).toBeVisible();

		// Recent mutations feed
		await expect(page.getByRole('heading', { name: 'Recent Transactions' })).toBeVisible();
	});
});
