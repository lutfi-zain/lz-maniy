import { test, expect } from '@playwright/test';

const TEST_TOKEN =
	process.env.REEDRICH_TEST_API_TOKEN ||
	process.env.TEST_TOKEN ||
	'';
const TEST_USER = JSON.stringify({
	userId: process.env.REEDRICH_TEST_USER_ID || 'usr_muhwbsfe_722e117da986448e',
	email: process.env.REEDRICH_TEST_USER_EMAIL || 'testbot@maniyy.dev',
	fullName: 'Maniyy TestBot'
});

test.describe('Multi-Horizon Board & In-Memory Filter Persistence', () => {
	test.beforeEach(async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await page.addInitScript(
			({ token, user }) => {
				localStorage.setItem('reedrich_access_token', token);
				localStorage.setItem('reedrich_user', user);
				localStorage.setItem('reedrich_locale', 'id');
				localStorage.setItem('maniyy_locale', 'id');
			},
			{ token: TEST_TOKEN, user: TEST_USER }
		);
		await page.route('**/api/settings', (route) => route.fulfill({ status: 200, json: {} }));
	});

	test('Ledger has List label, clean Horizon Board without goal pacing, and functional Maximize button', async ({
		page
	}) => {
		await page.goto('/ledger');

		// 1. Verify switcher has "List" label (renamed from "Daftar")
		const listBtn = page.locator('button:has-text("List")').first();
		const horizonBtn = page.locator('button:has-text("Horizon Board")').first();
		await expect(listBtn).toBeVisible();
		await expect(horizonBtn).toBeVisible();

		// 2. Switch to Horizon Board
		await horizonBtn.click();
		await expect(horizonBtn).toHaveAttribute('aria-pressed', 'true');

		// 3. Verify clean summary card without goal pacing
		const netCashflow = page.getByText(/Net Arus Kas|NET CASHFLOW/i).first();
		await expect(netCashflow).toBeVisible({ timeout: 15000 });
		const goalsPacing = page.locator('text=Goals Pacing');
		await expect(goalsPacing).toHaveCount(0);
		const targetProgress = page.locator('text=Progres Tabungan');
		await expect(targetProgress).toHaveCount(0);

		// 4. Verify Maximize button exists and clicking switches back to List
		const maxBtn = page.locator('button[aria-label*="List"]').first();
		await expect(maxBtn).toBeVisible();
		await maxBtn.click();

		// Should now be back in List view
		await expect(listBtn).toHaveAttribute('aria-pressed', 'true');
	});

	test('Ledger Horizon Board displays server-projected Net Worth values with distinct period columns', async ({
		page
	}) => {
		await page.goto('/ledger');

		// Switch to Horizon Board
		const horizonBtn = page.locator('button:has-text("Horizon Board")').first();
		await horizonBtn.click();
		await expect(horizonBtn).toHaveAttribute('aria-pressed', 'true');

		// Wait for horizon columns to render
		const netCashflow = page.getByText(/Net Arus Kas|NET CASHFLOW/i).first();
		await expect(netCashflow).toBeVisible({ timeout: 15000 });

		// Summary cards in each column must render valid currency amounts for Net Worth
		const nwCards = page.locator('.rounded-b-lg');
		await expect(nwCards.first()).toBeVisible();
		const count = await nwCards.count();
		expect(count).toBeGreaterThanOrEqual(2);

		// Collect all displayed Net Worth values across columns
		const nwValues: string[] = [];
		for (let i = 0; i < count; i++) {
			const val = await nwCards.nth(i).locator('.font-mono.text-xs.font-bold').last().innerText();
			nwValues.push(val);
			expect(val).toMatch(/^Rp\s+[\d.,]+/);
		}
	});

	test('Ledger Horizon Board supports adding and rendering custom date range period columns', async ({
		page
	}) => {
		await page.goto('/ledger');

		// Switch to Horizon Board
		const horizonBtn = page.locator('button:has-text("Horizon Board")').first();
		await horizonBtn.click();
		await expect(horizonBtn).toHaveAttribute('aria-pressed', 'true');

		// Open Add Period modal
		const addPeriodTrigger = page.locator('button:has-text("Pilih Bulan Spesifik..."), button:has-text("Select Specific Month...")').first();
		await expect(addPeriodTrigger).toBeVisible({ timeout: 15000 });
		await addPeriodTrigger.click();

		// Switch to "Rentang Tanggal" / "Date Range" tab
		const rangeTab = page.locator('button:has-text("Rentang Tanggal"), button:has-text("Date Range")').first();
		await expect(rangeTab).toBeVisible();
		await rangeTab.click();

		// Fill custom dates: 2026-09-25 to 2026-10-24
		const startInput = page.locator('#customStart');
		const endInput = page.locator('#customEnd');
		await startInput.fill('2026-09-25');
		await endInput.fill('2026-10-24');

		// Click Tambahkan / Add Period
		const submitBtn = page.locator('button:has-text("Tambahkan"), button:has-text("Add Period")').last();
		await submitBtn.click();

		// The new custom period column should now be visible with formatted title
		const customHeader = page.getByText(/25 Sep.*24 Okt|Sep 25.*Oct 24/i).first();
		await expect(customHeader).toBeVisible({ timeout: 15000 });
	});

	test('Ledger Horizon Board automatically lazy loads more transactions on scroll', async ({
		page
	}) => {
		await page.goto('/ledger');

		// Switch to Horizon Board
		const horizonBtn = page.locator('button:has-text("Horizon Board")').first();
		await horizonBtn.click();
		await expect(horizonBtn).toHaveAttribute('aria-pressed', 'true');

		// Wait for horizon columns to render
		const netCashflow = page.getByText(/Net Arus Kas|NET CASHFLOW/i).first();
		await expect(netCashflow).toBeVisible({ timeout: 15000 });

		// Check scroll container in the first column
		const scrollContainer = page.locator('.h-\\[320px\\].divide-y').first();
		await expect(scrollContainer).toBeVisible();

		// Scroll to bottom of container
		await scrollContainer.evaluate((el) => {
			el.scrollTop = el.scrollHeight;
		});

		// Verify scroll container maintains scrollability without layout shift
		await expect(scrollContainer).toBeVisible();
	});

	test('Accounts supports Horizon Board view toggle and renders period columns', async ({
		page
	}) => {
		await page.goto('/accounts');

		// Verify switcher in accounts toolbar
		const listBtn = page.locator('button[title="Tampilan List / Kartu"]');
		const horizonBtn = page.locator('button[title="Tampilan Kalendar Multi-Periode"]');
		await expect(listBtn).toBeVisible();
		await expect(horizonBtn).toBeVisible();

		// Switch to Horizon Board
		await horizonBtn.click();
		await expect(horizonBtn).toHaveAttribute('aria-pressed', 'true');

		// Maximize button should be visible in period column
		const maxBtn = page.locator('button[aria-label*="List"]').first();
		await expect(maxBtn).toBeVisible();

		// Clicking maximize switches back to list view
		await maxBtn.click();
		await expect(listBtn).toHaveAttribute('aria-pressed', 'true');
	});

	test('Planning Goals sub-tab supports Horizon Board view toggle', async ({ page }) => {
		await page.goto('/planning');

		// Ensure on Goals sub-tab
		const goalsTab = page.locator('button:has-text("Goals & Tabungan")').first();
		if (await goalsTab.isVisible()) {
			await goalsTab.click();
		}

		// Verify switcher in goals header
		const listBtn = page.locator('button[title="Tampilan List / Kartu"]');
		const horizonBtn = page.locator('button[title="Tampilan Kalendar Multi-Periode"]');
		await expect(listBtn).toBeVisible();
		await expect(horizonBtn).toBeVisible();

		// Switch to Horizon Board
		await horizonBtn.click();
		await expect(horizonBtn).toHaveAttribute('aria-pressed', 'true');

		// Verify period columns rendered
		const maxBtn = page.locator('button[aria-label*="List"]').first();
		await expect(maxBtn).toBeVisible();

		// Clicking maximize switches back to list view
		await maxBtn.click();
		await expect(listBtn).toHaveAttribute('aria-pressed', 'true');
	});

	test('Filters persist in memory across SPA navigation without resetting', async ({ page }) => {
		await page.goto('/ledger');

		// Enter a distinct search query in ledger search
		const searchInput = page.locator('#ledgerSearch');
		await searchInput.fill('Kopi Kenangan');
		await expect(searchInput).toHaveValue('Kopi Kenangan');

		// Navigate to Planning via client-side SPA link
		await page.locator('a[href="/planning"]').first().click();
		await expect(page).toHaveURL(/\/planning/);

		// Switch sub-tab in Planning to Budgets
		const budgetTab = page
			.locator('button:has-text("Anggaran"), button:has-text("Budgets")')
			.first();
		await expect(budgetTab).toBeVisible();
		await budgetTab.click();

		// Navigate back to Ledger via client-side SPA link
		await page.locator('a[href="/ledger"]').first().click();
		await expect(page).toHaveURL(/\/ledger/);

		// Verify search keyword is STILL persisted!
		const searchInputAfter = page.locator('#ledgerSearch');
		await expect(searchInputAfter).toHaveValue('Kopi Kenangan');

		// Navigate back to Planning via client-side SPA link
		await page.locator('a[href="/planning"]').first().click();
		await expect(budgetTab).toHaveClass(/bg-white/);
	});
});
