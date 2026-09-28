import { test, expect } from '@playwright/test';

const TEST_TOKEN = '$REEDRICH_TEST_API_TOKEN';
const TEST_USER = JSON.stringify({
	userId: 'usr_muhwbsfe_722e117da986448e',
	email: 'testbot@maniyy.dev',
	fullName: 'Maniyy TestBot'
});

test.describe('Goal CRUD Operations (Test Account)', () => {
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

	test('opens goal form drawer from toolbar', async ({ page }) => {
		const addBtn = page.locator('button:has-text("+ Buat Target")').first();
		await expect(addBtn).toBeVisible();
		await addBtn.click();

		const drawer = page.locator('div[aria-labelledby="drawer-title"]');
		await expect(drawer).toBeVisible();
		await expect(page.locator('#drawer-title')).toContainText('Buat Target Tabungan');

		// Press ESC to close
		await page.keyboard.press('Escape');
		await expect(drawer).not.toBeVisible();
	});

	test('validates target name and positive amount', async ({ page }) => {
		await page.locator('button:has-text("+ Buat Target")').first().click();

		const submitBtn = page.locator('button[type="submit"]:has-text("Simpan Target")');
		await expect(submitBtn).toBeDisabled();

		await page.fill('#goal-name', 'Dana Darurat');
		await page.fill('#goal-target', '20000000');
		await expect(submitBtn).toBeEnabled();
	});
});
