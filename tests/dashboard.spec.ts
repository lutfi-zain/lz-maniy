import { test, expect } from '@playwright/test';

test.describe('Dashboard Initial Render & KPIs', () => {
	test('renders document title and brand heading', async ({ page }) => {
		await page.goto('/');

		await expect(page).toHaveTitle(/Maniyy/);
		const heading = page.locator('h1');
		await expect(heading).toContainText('Potret Keuangan Komprehensif');
	});

	test('renders macro KPI values', async ({ page }) => {
		await page.goto('/');

		// Net worth card
		const netWorth = page.locator('#kpis').locator('text=Kekayaan Bersih Konsolidasi');
		await expect(netWorth).toBeVisible();

		// Spendable cash
		const spendable = page.locator('#kpis').locator('text=Spendable (Tak Terkunci)');
		await expect(spendable).toBeVisible();

		// Locked cash
		const locked = page.locator('#kpis').locator('text=Locked (Cadangan)');
		await expect(locked).toBeVisible();
	});

	test('filters wallet list using tabs', async ({ page }) => {
		await page.goto('/');

		const walletSection = page.locator('#sec-wallets');
		await expect(walletSection).toBeVisible();

		// Check spendable tab
		const spendableBtn = walletSection.getByRole('button', { name: /Spendable/ });
		await spendableBtn.click();
		await expect(walletSection.getByText('BCA Main', { exact: true })).toBeVisible();

		// Check locked tab
		const lockedBtn = walletSection.getByRole('button', { name: /Locked/ });
		await lockedBtn.click();
		await expect(walletSection.getByText('OCBC Main Sewa Rumah', { exact: true })).toBeVisible();

		// Check all tab
		const allBtn = walletSection.getByRole('button', { name: /Semua/ });
		await allBtn.click();
		await expect(walletSection.getByText('BCA Main', { exact: true })).toBeVisible();
		await expect(walletSection.getByText('OCBC Main Sewa Rumah', { exact: true })).toBeVisible();
	});
});
