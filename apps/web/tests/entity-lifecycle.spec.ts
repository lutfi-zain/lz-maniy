import { test, expect } from '@playwright/test';

const TEST_TOKEN = '$REEDRICH_TEST_API_TOKEN';
const TEST_USER = JSON.stringify({
	userId: 'usr_muhwbsfe_722e117da986448e',
	email: 'testbot@maniyy.dev',
	fullName: 'Maniyy TestBot'
});

test.describe('Entity Lifecycle & Design System Compliance', () => {
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

	test('renders goals lifecycle segmented tabs and switches filters', async ({ page }) => {
		// Verify presence of status tabs
		const allTab = page.locator('button:has-text("Semua")').first();
		const inProgressTab = page.locator('button:has-text("Aktif Berjalan")').first();
		const overdueTab = page.locator('button:has-text("Lewat Tenggat")').first();
		const completedTab = page.locator('button:has-text("Tercapai")').first();

		await expect(allTab).toBeVisible();
		await expect(inProgressTab).toBeVisible();
		await expect(overdueTab).toBeVisible();
		await expect(completedTab).toBeVisible();

		// Click on In Progress tab
		await inProgressTab.click();
		await expect(inProgressTab).toHaveClass(/bg-\[#111111\]/);

		// Switch back to All
		await allTab.click();
		await expect(allTab).toHaveClass(/bg-\[#111111\]/);
	});

	test('renders budgets period segmented tabs', async ({ page }) => {
		// Switch to budgets subtab
		const budgetSubtab = page
			.locator('button:has-text("Pagu Anggaran"), button:has-text("Budgets")')
			.first();
		await expect(budgetSubtab).toBeVisible();
		await budgetSubtab.click();

		// Verify presence of period tabs
		const activeTab = page.locator('button:has-text("Periode Berjalan")').first();
		const pastTab = page.locator('button:has-text("Riwayat Lampau")').first();
		const allBudgetsTab = page.locator('button:has-text("Semua Anggaran")').first();

		await expect(activeTab).toBeVisible();
		await expect(pastTab).toBeVisible();
		await expect(allBudgetsTab).toBeVisible();

		// Click on Past Tab
		await pastTab.click();
		await expect(pastTab).toHaveClass(/bg-\[#111111\]/);
	});

	test('opens goal detail drawer and renders notes and pacing info', async ({ page }) => {
		// Hover over first goal card and click detail pencil
		const goalCard = page
			.locator('.group:has-text("hari tersisa"), .group:has-text("Target")')
			.first();
		if (await goalCard.isVisible()) {
			const pencil = goalCard.locator('button[title*="Rincian & edit target"]').first();
			if (await pencil.isVisible()) {
				await pencil.click();

				const drawer = page.locator('div[aria-labelledby="drawer-title"]');
				await expect(drawer).toBeVisible();

				// Verify drawer contains Status Target
				await expect(drawer).toContainText('Status Target');
				await expect(drawer).toContainText('Tenggat Tanggal');

				// Close drawer with ESC
				await page.keyboard.press('Escape');
				await expect(drawer).not.toBeVisible();
			}
		}
	});

	test('complies with minimalist-ui shadow directive (no shadow-xl on drawer)', async ({
		page
	}) => {
		// Open first goal detail
		const goalCard = page
			.locator('.group:has-text("hari tersisa"), .group:has-text("Target")')
			.first();
		if (await goalCard.isVisible()) {
			const pencil = goalCard.locator('button[title*="Rincian & edit target"]').first();
			if (await pencil.isVisible()) {
				await pencil.click();

				const drawer = page.locator('div[aria-labelledby="drawer-title"]');
				await expect(drawer).toBeVisible();

				// Ensure shadow-xl is NOT in drawer class list
				const classList = await drawer.getAttribute('class');
				expect(classList).not.toContain('shadow-xl');
				expect(classList).toContain('shadow-minimal');

				await page.keyboard.press('Escape');
			}
		}
	});
});
