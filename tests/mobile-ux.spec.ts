import { test, expect } from '@playwright/test';

test.describe('Mobile-Native UX & Responsive Ergonomics', () => {
	test('renders sticky bottom nav and navigates between studios on mobile viewport', async ({
		page
	}) => {
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto('/');

		// Bottom navigation bar must be visible
		const bottomNav = page.locator('#bottomNav');
		await expect(bottomNav).toBeVisible();

		// Topbar navigation links must be hidden on mobile
		const topbarNav = page.locator('header nav');
		await expect(topbarNav).toBeHidden();

		// Verify 4 bottom navigation items
		await expect(bottomNav.getByRole('link', { name: 'Cockpit' })).toBeVisible();
		await expect(bottomNav.getByRole('link', { name: /Ledger/ })).toBeVisible();
		await expect(bottomNav.getByRole('link', { name: /Akun/ })).toBeVisible();
		await expect(bottomNav.getByRole('link', { name: 'Planning' })).toBeVisible();

		// Cockpit Option A hierarchy:
		// 1. KPI grid (compact)
		await expect(page.locator('#kpis')).toBeVisible();
		// 2. Quick Cash Bar on mobile
		await expect(page.locator('text=Likuiditas Akun')).toBeVisible();
		// 3. Mutasi Terkini
		await expect(page.getByRole('heading', { name: 'Mutasi Terkini' })).toBeVisible();

		// Navigate to Ledger via Bottom Nav
		await bottomNav.getByRole('link', { name: /Ledger/ }).click();
		await expect(page).toHaveURL('/ledger');

		// In /ledger on mobile, dense rows feed must be visible
		const mobileFeed = page.locator('div.divide-y.md\\:hidden');
		await expect(mobileFeed).toBeVisible();

		// Desktop table must be hidden on mobile
		const desktopTable = page.locator('div.hidden.md\\:block table');
		await expect(desktopTable).toBeHidden();

		// Navigate to Akun via Bottom Nav
		await bottomNav.getByRole('link', { name: /Akun/ }).click();
		await expect(page).toHaveURL('/accounts');

		// Navigate to Planning via Bottom Nav
		await bottomNav.getByRole('link', { name: 'Planning' }).click();
		await expect(page).toHaveURL('/planning');
	});

	test('preserves desktop topbar navigation and tabular grid on desktop viewport', async ({
		page
	}) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await page.goto('/');

		// Bottom nav must be hidden on desktop
		const bottomNav = page.locator('#bottomNav');
		await expect(bottomNav).toBeHidden();

		// Topbar navigation must be visible on desktop
		const topbarNav = page.locator('header nav');
		await expect(topbarNav).toBeVisible();

		// Cockpit full bank sidebar must be visible
		await expect(page.locator('text=Saldo per Institusi')).toBeVisible();

		// Navigate to Ledger
		await page.goto('/ledger');

		// Desktop table must be visible on desktop
		const desktopTable = page.locator('div.hidden.md\\:block table');
		await expect(desktopTable).toBeVisible();
	});
});
