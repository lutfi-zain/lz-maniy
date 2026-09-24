import { test, expect } from '@playwright/test';

test.describe('Custom 2-Click DateRangePicker Component', () => {
	test('opens date picker popover and applies presets including Bulan Depan and Bulan Ini', async ({
		page
	}) => {
		await page.goto('/ledger');

		// Find DateRangePicker trigger
		const datePickerTrigger = page.locator('button:has-text("Bulan Ini")').first();
		await expect(datePickerTrigger).toBeVisible();

		// Click to open popover
		await datePickerTrigger.click();

		// Check preset buttons inside popover
		const bulanDepanBtn = page.getByRole('button', { name: 'Bulan Depan' });
		await expect(bulanDepanBtn).toBeVisible();

		const bulanIniBtn = page.getByRole('button', { name: 'Bulan Ini', exact: true });
		await expect(bulanIniBtn).toBeVisible();

		// Click "Bulan Depan"
		await bulanDepanBtn.click();
		await expect(page.locator('button:has-text("Bulan Depan")').first()).toBeVisible();

		// Open again and click "Bulan Ini"
		await page.locator('button:has-text("Bulan Depan")').first().click();
		await bulanIniBtn.click();
		await expect(page.locator('button:has-text("Bulan Ini")').first()).toBeVisible();
	});
});
