import { test, expect } from '@playwright/test';

const TEST_TOKEN = 'rd_live_6133a5ec3ca3c2fc1d224f677cc31c13';
const TEST_USER = JSON.stringify({
	userId: 'usr_muhwbsfe_722e117da986448e',
	email: 'testbot@maniyy.dev',
	fullName: 'Maniyy TestBot'
});

test.describe('Wallet CRUD Operations (Test Account)', () => {
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(
			({ token, user }) => {
				localStorage.setItem('reedrich_access_token', token);
				localStorage.setItem('reedrich_user', user);
			},
			{ token: TEST_TOKEN, user: TEST_USER }
		);
		await page.goto('/accounts');
	});

	test('opens and closes wallet form drawer', async ({ page }) => {
		const addBtn = page.locator('button:has-text("+ Dompet")').first();
		await expect(addBtn).toBeVisible();
		await addBtn.click();

		const drawer = page.locator('div[aria-labelledby="drawer-title"]');
		await expect(drawer).toBeVisible();
		await expect(page.locator('#drawer-title')).toContainText('Tambah Dompet');

		// Press ESC to close
		await page.keyboard.press('Escape');
		await expect(drawer).not.toBeVisible();
	});

	test('validates required wallet name', async ({ page }) => {
		await page.locator('button:has-text("+ Dompet")').first().click();
		const submitBtn = page.locator('button[type="submit"]:has-text("Simpan Dompet")');

		// Name is empty initially, submit should be disabled
		await expect(submitBtn).toBeDisabled();

		// Fill name
		await page.fill('#wallet-name', 'Test Dompet');
		await expect(submitBtn).toBeEnabled();
	});
});
