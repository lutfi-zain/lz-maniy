import { test, expect } from '@playwright/test';

const TEST_TOKEN = 'rd_live_6133a5ec3ca3c2fc1d224f677cc31c13';
const TEST_USER = JSON.stringify({
	userId: 'usr_muhwbsfe_722e117da986448e',
	email: 'testbot@maniyy.dev',
	fullName: 'Maniyy TestBot'
});

test.describe('Category CRUD Operations (Test Account)', () => {
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(
			({ token, user }) => {
				localStorage.setItem('reedrich_access_token', token);
				localStorage.setItem('reedrich_user', user);
			},
			{ token: TEST_TOKEN, user: TEST_USER }
		);
		await page.goto('/');
	});

	test('opens category form from cashflow section', async ({ page }) => {
		const addBtn = page.locator('button:has-text("+ Kategori")').first();
		if (await addBtn.isVisible()) {
			await addBtn.click();
			const drawer = page.locator('div[role="dialog"]');
			await expect(drawer).toBeVisible();
			await expect(page.locator('#drawer-title')).toContainText('Tambah Kategori');
			await page.keyboard.press('Escape');
			await expect(drawer).not.toBeVisible();
		}
	});

	test('validates category name and allows selecting type', async ({ page }) => {
		const addBtn = page.locator('button:has-text("+ Kategori")').first();
		if (await addBtn.isVisible()) {
			await addBtn.click();
			const submitBtn = page.locator('button[type="submit"]:has-text("Simpan Kategori")');
			await expect(submitBtn).toBeDisabled();

			await page.fill('#cat-name', 'Hiburan');
			await expect(submitBtn).toBeEnabled();

			// Toggle to Pemasukan
			await page.locator('button:has-text("Pemasukan")').click();
			await expect(submitBtn).toBeEnabled();
		}
	});
});
