import { test, expect } from '@playwright/test';

const TEST_TOKEN = 'rd_live_6133a5ec3ca3c2fc1d224f677cc31c13';
const TEST_USER = JSON.stringify({
	userId: 'usr_muhwbsfe_722e117da986448e',
	email: 'testbot@maniyy.dev',
	fullName: 'Maniyy TestBot'
});

test.describe('Server-Driven Fetching, Horizon Projections & Concurrency Pool', () => {
	test.beforeEach(async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await page.addInitScript(
			({ token, user }) => {
				localStorage.setItem('reedrich_access_token', token);
				localStorage.setItem('reedrich_user', user);
				localStorage.setItem('reedrich_locale', 'id');
			},
			{ token: TEST_TOKEN, user: TEST_USER }
		);
	});

	test('Ledger executes server-driven querying with keyword search and pagination metadata', async ({
		page
	}) => {
		let capturedUrl = '';
		page.on('request', (req) => {
			if (req.url().includes('/api/v1/transactions')) {
				capturedUrl = req.url();
			}
		});

		const initialQuery = page.waitForResponse(
			(res) => res.url().includes('/api/v1/transactions') && res.url().includes('envelope=true')
		);
		await page.goto('/ledger');
		await initialQuery;
		// Verify table rendered with total baris label
		const totalBaris = page.locator('text=total baris').first();
		await expect(totalBaris).toBeVisible();

		// Search for Alfamart
		const searchInput = page.locator('#ledgerSearch');
		await searchInput.fill('Alfamart');

		// Wait for query to complete
		await page.waitForResponse((res) => res.url().includes('q=Alfamart'));

		// Verify the request included envelope=true and q=Alfamart
		expect(capturedUrl).toContain('envelope=true');
		expect(capturedUrl).toContain('q=Alfamart');

		// Verify search result row is displayed
		const row = page.locator('text=Belanja bulanan Alfamart').first();
		await expect(row).toBeVisible();
	});

	test('Horizon Board executes localized card-level queries via concurrency pool', async ({
		page
	}) => {
		const columnUrls: string[] = [];
		page.on('request', (req) => {
			if (req.url().includes('/api/v1/transactions?')) {
				columnUrls.push(req.url());
			}
		});

		await page.goto('/ledger');

		// Switch to Horizon Board
		const horizonBtn = page.locator('button:has-text("Horizon Board")').first();
		await horizonBtn.click();

		// Wait for period column cards to appear
		const columnHeader = page.locator('h2:has-text("2026")').first();
		await expect(columnHeader).toBeVisible();

		// Verify card-level queries were dispatched with startDate and endDate
		const cardQueries = columnUrls.filter(
			(u) => u.includes('startDate=') && u.includes('endDate=')
		);
		expect(cardQueries.length).toBeGreaterThan(0);
	});

	test('Accounts Horizon Board loads edge projections successfully', async ({ page }) => {
		let horizonApiCalled = false;
		page.on('request', (req) => {
			if (req.url().includes('/api/v1/analytics/horizon')) {
				horizonApiCalled = true;
			}
		});

		await page.goto('/accounts');

		// Switch to Horizon Board
		const horizonBtn = page.locator('button[title="Tampilan Kalendar Multi-Periode"]');
		await horizonBtn.click();

		// Wait for period columns to render
		const periodTitle = page.locator('h2:has-text("2026")').first();
		await expect(periodTitle).toBeVisible();

		// Verify edge projections endpoint was called
		expect(horizonApiCalled).toBe(true);
	});
});
