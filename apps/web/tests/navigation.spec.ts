import { test, expect } from '@playwright/test';

test.describe('Multi-Route Studio Navigation', () => {
	test('navigates cleanly across all 4 studios via global topbar', async ({ page }) => {
		await page.goto('/');

		// Check Cockpit home
		await expect(page).toHaveTitle(/Maniyy/);
		await expect(page.locator('#kpis')).toBeVisible();

		// Navigate to Ledger Studio
		await page.locator('header nav a[href="/ledger"]').click();
		await expect(page).toHaveURL(/\/ledger/);
		await expect(page.locator('h1')).toContainText('Ledger Studio');

		// Navigate to Accounts Matrix
		await page.locator('header nav a[href="/accounts"]').click();
		await expect(page).toHaveURL(/\/accounts/);
		await expect(page.locator('h1')).toContainText('Matriks Akun & Bank');
		await expect(
			page
				.getByText('Bank Central Asia (BCA)')
				.or(page.getByText('BCA', { exact: true }))
				.first()
		).toBeVisible();

		// Navigate to Planning Studio
		await page.locator('header nav a[href="/planning"]').click();
		await expect(page).toHaveURL(/\/planning/);
		await expect(page.locator('h1')).toContainText('Studio Perencanaan');

		// Back to Cockpit
		await page.locator('header nav a[href="/"]').click();
		await expect(page).toHaveURL(/\/$/);
		await expect(page.locator('#kpis')).toBeVisible();
	});
});
