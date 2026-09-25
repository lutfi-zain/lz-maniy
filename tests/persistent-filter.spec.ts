import { test, expect } from '@playwright/test';

test.describe('Global Persistent Date Filter State', () => {
	test('preserves selected date range when navigating across studio pages', async ({ page }) => {
		await page.goto('/ledger');

		// Open DateRangePicker in ledger and select "Bulan Depan"
		const ledgerPicker = page.locator('button:has-text("Bulan Ini")').first();
		await expect(ledgerPicker).toBeVisible();
		await ledgerPicker.click();

		const bulanDepanBtn = page.getByRole('button', { name: 'Bulan Depan' });
		await expect(bulanDepanBtn).toBeVisible();
		await bulanDepanBtn.click();

		// Ledger picker should now display "Bulan Depan"
		await expect(page.locator('button:has-text("Bulan Depan")').first()).toBeVisible();

		// Navigate to /accounts via BottomNav or Topbar
		await page.goto('/accounts');

		// DateRangePicker in /accounts MUST also display "Bulan Depan"
		const accountsPicker = page.locator('button:has-text("Bulan Depan")').first();
		await expect(accountsPicker).toBeVisible();

		// Navigate to /planning
		await page.goto('/planning');

		// DateRangePicker in /planning MUST also display "Bulan Depan"
		const planningPicker = page.locator('button:has-text("Bulan Depan")').first();
		await expect(planningPicker).toBeVisible();
	});

	test('preserves selected date filter across browser page reloads', async ({ page }) => {
		await page.goto('/ledger');

		// Select "Bulan Depan"
		const ledgerPicker = page.locator('button:has-text("Bulan Ini")').first();
		await ledgerPicker.click();
		await page.getByRole('button', { name: 'Bulan Depan' }).click();

		// Reload browser
		await page.reload();

		// Should still be "Bulan Depan"
		await expect(page.locator('button:has-text("Bulan Depan")').first()).toBeVisible();

		// Verify stored in localStorage
		const storedFilter = await page.evaluate(() => localStorage.getItem('maniyy_date_filter'));
		expect(storedFilter).toBeTruthy();
		expect(JSON.parse(storedFilter!).preset).toBe('next_month');
	});

	test('clicking Reset button returns filter to Bulan Ini and purges storage', async ({ page }) => {
		await page.goto('/ledger');

		// Set to "Bulan Depan"
		await page.locator('button:has-text("Bulan Ini")').first().click();
		await page.getByRole('button', { name: 'Bulan Depan' }).click();
		await expect(page.locator('button:has-text("Bulan Depan")').first()).toBeVisible();

		// Reset button should now be visible beside date picker
		const resetBtn = page.locator('button:has-text("Reset")').first();
		await expect(resetBtn).toBeVisible();
		await resetBtn.click();

		// Picker returns to "Bulan Ini"
		await expect(page.locator('button:has-text("Bulan Ini")').first()).toBeVisible();

		// Local storage is reset to this_month or purged
		const storedFilter = await page.evaluate(() => localStorage.getItem('maniyy_date_filter'));
		if (storedFilter) {
			expect(JSON.parse(storedFilter).preset).toBe('this_month');
		} else {
			expect(storedFilter).toBeNull();
		}
	});
});
