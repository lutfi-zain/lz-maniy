import { test, expect } from '@playwright/test';

const TEST_TOKEN = process.env.REEDRICH_TEST_API_TOKEN || process.env.TEST_TOKEN || '';
const TEST_USER = JSON.stringify({
	userId: process.env.REEDRICH_TEST_USER_ID || 'usr_muhwbsfe_722e117da986448e',
	email: process.env.REEDRICH_TEST_USER_EMAIL || 'testbot@maniyy.dev',
	fullName: 'Maniyy TestBot'
});

test.describe('Budget CRUD Operations (Test Account)', () => {
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(
			({ token, user }) => {
				localStorage.setItem('reedrich_access_token', token);
				localStorage.setItem('reedrich_user', user);
			},
			{ token: TEST_TOKEN, user: TEST_USER }
		);
		await page.goto('/planning');
	});

	test('opens budget form from planning page toolbar', async ({ page }) => {
		// Switch to budgets tab
		await page.locator('button:has-text("Pagu Anggaran")').first().click();

		const addBtn = page.locator('button:has-text("+ Tambah Budget")').first();
		await expect(addBtn).toBeVisible();
		await addBtn.click();

		const drawer = page.locator('div[aria-labelledby="drawer-title"]');
		await expect(drawer).toBeVisible();
		await expect(page.locator('#drawer-title')).toContainText('Tambah Pagu Anggaran');

		// Press ESC to close
		await page.keyboard.press('Escape');
		await expect(drawer).not.toBeVisible();
	});

	test('validates budget inputs', async ({ page }) => {
		await page.locator('button:has-text("Pagu Anggaran")').first().click();
		await page.locator('button:has-text("+ Tambah Budget")').first().click();

		const submitBtn = page.locator('button[type="submit"]:has-text("Simpan Pagu")');
		await expect(submitBtn).toBeDisabled();

		await page.fill('#budget-name', 'Makan Bulanan');
		await page.fill('#budget-amount', '1500000');
		await expect(submitBtn).toBeEnabled();
	});
});
