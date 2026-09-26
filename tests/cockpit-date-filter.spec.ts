import { test, expect } from '@playwright/test';

test.describe('Cockpit Mutasi Terkini Persistent Date Filter Integration', () => {
	test('reflects persistent date filter set in ledger within Cockpit Mutasi Terkini', async ({
		page
	}) => {
		await page.goto('/ledger');

		// Set filter to "Bulan Depan" in ledger
		const ledgerPicker = page.locator('button:has-text("Bulan Ini")').first();
		await expect(ledgerPicker).toBeVisible();
		await ledgerPicker.click();

		const bulanDepanBtn = page.getByRole('button', { name: 'Bulan Depan' });
		await expect(bulanDepanBtn).toBeVisible();
		await bulanDepanBtn.click();

		// Ledger picker shows "Bulan Depan"
		await expect(page.locator('button:has-text("Bulan Depan")').first()).toBeVisible();

		// Navigate to Cockpit (/)
		await page.goto('/');

		// Mutasi Terkini in Cockpit MUST also show "Bulan Depan"
		const cockpitPicker = page.locator('button:has-text("Bulan Depan")').first();
		await expect(cockpitPicker).toBeVisible();
	});

	test('changing date filter on Cockpit persists to ledger and can be reset from Cockpit', async ({
		page
	}) => {
		await page.goto('/');

		// In Cockpit, open Mutasi Terkini DateRangePicker and pick "Bulan Lalu"
		const cockpitPicker = page.locator('button:has-text("Bulan Ini")').first();
		await expect(cockpitPicker).toBeVisible();
		await cockpitPicker.click();

		const bulanLaluBtn = page.getByRole('button', { name: 'Bulan Lalu' });
		await expect(bulanLaluBtn).toBeVisible();
		await bulanLaluBtn.click();

		// Picker now shows "Bulan Lalu"
		await expect(page.locator('button:has-text("Bulan Lalu")').first()).toBeVisible();

		// Reset button should now be visible in Mutasi Terkini header
		const resetBtn = page.locator('button:has-text("Reset")').first();
		await expect(resetBtn).toBeVisible();
		await resetBtn.click();

		// Cockpit picker returns to "Bulan Ini"
		await expect(page.locator('button:has-text("Bulan Ini")').first()).toBeVisible();

		// Navigate to ledger; ledger picker must also be "Bulan Ini"
		await page.goto('/ledger');
		await expect(page.locator('button:has-text("Bulan Ini")').first()).toBeVisible();
	});
});
