import { test, expect } from '@playwright/test';

const TEST_TOKEN = process.env.REEDRICH_TEST_API_TOKEN || process.env.TEST_TOKEN || '';
const TEST_USER = JSON.stringify({
	userId: process.env.REEDRICH_TEST_USER_ID || 'usr_muhwbsfe_722e117da986448e',
	email: process.env.REEDRICH_TEST_USER_EMAIL || 'testbot@maniyy.dev',
	fullName: 'Maniyy TestBot'
});

test.describe('Recurring CRUD Operations (Test Account)', () => {
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

	test('opens recurring form drawer from toolbar in obligations tab', async ({ page }) => {
		await page.locator('button:has-text("Kewajiban & Rutin")').first().click();

		const addBtn = page.locator('button:has-text("+ Tambah Recurring")').first();
		await expect(addBtn).toBeVisible();
		await addBtn.click();

		const drawer = page.locator('div[aria-labelledby="drawer-title"]');
		await expect(drawer).toBeVisible();
		await expect(page.locator('#drawer-title')).toContainText('Tambah Tagihan Rutin');

		// Press ESC to close
		await page.keyboard.press('Escape');
		await expect(drawer).not.toBeVisible();
	});

	test('validates recurring template fields', async ({ page }) => {
		await page.locator('button:has-text("Kewajiban & Rutin")').first().click();
		await page.locator('button:has-text("+ Tambah Recurring")').first().click();

		const submitBtn = page.locator('button[type="submit"]:has-text("Simpan Tagihan")');
		await expect(submitBtn).toBeDisabled();

		await page.fill('#rec-name', 'Langganan Internet');
		await page.fill('#rec-amount', '350000');
		// Wallet is selected by default if wallets exist
		const walletSelect = page.locator('#rec-wallet');
		const walletVal = await walletSelect.inputValue();
		if (walletVal) {
			await expect(submitBtn).toBeEnabled();
		}
	});
});
