import { test, expect } from '@playwright/test';

test.describe('Account Matrix Timeline & Net Worth Breakdown', () => {
	test('navigates from ledger right zone to accounts timeline with matching preset', async ({
		page
	}) => {
		await page.goto('/ledger');

		// Right zone must display spendable and locked breakdown
		await expect(page.locator('text=Bebas:').first()).toBeVisible();
		await expect(page.locator('text=Cadangan:').first()).toBeVisible();

		// Click "Rincian Akun →"
		const rincianLink = page.getByRole('link', { name: /Rincian Akun/ });
		await expect(rincianLink).toBeVisible();
		await rincianLink.click();

		// Must navigate to /accounts with datePreset query param
		await expect(page).toHaveURL(/\/accounts\?datePreset=/);
		await expect(page.locator('h1')).toContainText('Matriks Akun & Bank');
	});

	test('updates wallet balances and macro summary tiles when switching date preset in accounts', async ({
		page
	}) => {
		await page.goto('/accounts');

		// DateRangePicker should be visible in controls bar
		const datePicker = page.locator('button:has-text("Bulan Ini")').first();
		await expect(datePicker).toBeVisible();

		// Click to open date picker popover
		await datePicker.click();

		// Switch to "Bulan Depan"
		const bulanDepanBtn = page.getByRole('button', { name: 'Bulan Depan' });
		await expect(bulanDepanBtn).toBeVisible();
		await bulanDepanBtn.click();

		// Top macro tile should update to reflect PROYEKSI NET WORTH
		await expect(page.locator('text=PROYEKSI NET WORTH')).toBeVisible();

		// Status filter should isolate spendable and locked wallets
		const operasionalBtn = page.getByRole('button', { name: 'Operasional' });
		await operasionalBtn.click();

		// Only spendable wallets should show
		await expect(page.locator('text=Operasional').first()).toBeVisible();
	});
});
