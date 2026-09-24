import { test, expect } from '@playwright/test';

test.describe('Slide-Over Drilldown Drawer', () => {
	test('opens drawer when wallet card is clicked and closes on ESC', async ({ page }) => {
		await page.goto('/');

		// Click BCA Main wallet card
		const walletCard = page.locator('#sec-wallets').getByText('BCA Main').first();
		await walletCard.click();

		// Drawer should slide in
		const drawer = page.locator('aside[role="dialog"], div[role="dialog"]');
		await expect(drawer).toBeVisible();
		await expect(drawer.locator('#drawer-title')).toContainText('BCA Main');

		// Press Escape to dismiss
		await page.keyboard.press('Escape');
		await expect(drawer).not.toBeVisible();
	});

	test('opens category drawer when category breakdown bar is clicked', async ({ page }) => {
		await page.goto('/');

		// Click on Makan & Minum category row
		const catRow = page.locator('#sec-cashflow').getByText('Makan & Minum').first();
		await catRow.click();

		// Drawer should slide in with category data
		const drawer = page.locator('aside[role="dialog"], div[role="dialog"]');
		await expect(drawer).toBeVisible();
		await expect(drawer.locator('#drawer-title')).toContainText('Makan & Minum');

		// Close via ESC
		await page.keyboard.press('Escape');
		await expect(drawer).not.toBeVisible();
	});

	test('opens goal drawer showing derived linked wallets breakdown', async ({ page }) => {
		await page.goto('/');

		// Click Sewa Rumah 2026 goal card
		const goalCard = page.locator('#sec-goals').getByText('Sewa Rumah 2026').first();
		await goalCard.click();

		// Drawer should show linked wallets
		const drawer = page.locator('aside[role="dialog"], div[role="dialog"]');
		await expect(drawer).toBeVisible();
		await expect(drawer.locator('#drawer-title')).toContainText('Sewa Rumah 2026');
		await expect(drawer.getByText(/BCA Pocket Sewa Rumah/)).toBeVisible();

		// Close via close button
		const closeBtn = drawer.locator('button:has-text("ESC")');
		await closeBtn.click();
		await expect(drawer).not.toBeVisible();
	});
});
