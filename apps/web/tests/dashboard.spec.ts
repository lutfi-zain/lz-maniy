import { test, expect } from '@playwright/test';

test.describe('Dashboard Initial Render & Cockpit KPIs', () => {
	test('renders document title and brand heading', async ({ page }) => {
		await page.goto('/');

		await expect(page).toHaveTitle(/Maniyy/);
		const brand = page.locator('header');
		await expect(brand).toContainText('Maniyy');
	});

	test('renders macro KPI values in Cockpit', async ({ page }) => {
		await page.goto('/');

		// Net worth card
		const netWorth = page.locator('#kpis').locator('text=Kekayaan Bersih');
		await expect(netWorth).toBeVisible();

		// Spendable cash
		const spendable = page.locator('#kpis').locator('text=Kas Siap Pakai');
		await expect(spendable).toBeVisible();

		// Locked cash
		const locked = page.locator('#kpis').locator('text=Dana Cadangan');
		await expect(locked).toBeVisible();
	});

	test('displays bank widgets and recent feed in workbench', async ({ page }) => {
		await page.goto('/');

		// Bank widget
		await expect(page.getByText('Saldo per Institusi')).toBeVisible();
		await expect(page.getByText('BCA', { exact: true }).first()).toBeVisible();

		// Recent mutations feed
		await expect(page.getByRole('heading', { name: 'Mutasi Terkini' })).toBeVisible();
	});
});
