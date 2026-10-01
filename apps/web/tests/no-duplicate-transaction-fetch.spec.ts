import { test, expect } from '@playwright/test';

const TEST_TOKEN = '$REEDRICH_TEST_API_TOKEN';
const TEST_USER = JSON.stringify({
	userId: 'usr_muhwbsfe_722e117da986448e',
	email: 'testbot@maniyy.dev',
	fullName: 'Maniyy TestBot'
});

test.describe('No Duplicate Transaction Fetches or Unbounded Loops', () => {
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

	test('Navigation sequence issues zero limit=200 loops and zero duplicate cockpit hits', async ({
		page
	}) => {
		const transactionRequests: Array<{ url: string; timestamp: number }> = [];

		page.on('request', (req) => {
			if (req.url().includes('/api/v1/transactions')) {
				transactionRequests.push({
					url: req.url(),
					timestamp: Date.now()
				});
			}
		});

		// 1. Mount Cockpit
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// 2. Navigate to Accounts
		await page.locator('nav a[href="/accounts"], a[href="/accounts"]').first().click();
		await expect(page).toHaveURL(/\/accounts/);
		await page.waitForLoadState('networkidle');

		// 3. Navigate back to Cockpit
		await page.locator('nav a[href="/"], a[href="/"]').first().click();
		await expect(page).toHaveURL(/\//);
		await page.waitForLoadState('networkidle');

		// 4. Navigate to Ledger
		await page.locator('nav a[href="/ledger"], a[href="/ledger"]').first().click();
		await expect(page).toHaveURL(/\/ledger/);
		await page.waitForLoadState('networkidle');

		// Verification 1: Zero limit=200 unbounded loop requests
		const whileLoopRequests = transactionRequests.filter((r) => r.url.includes('limit=200'));
		expect(whileLoopRequests.length).toBe(0);

		// Verification 2: Every single transaction request uses envelope=true
		for (const req of transactionRequests) {
			expect(req.url).toContain('envelope=true');
		}

		// Verification 3: Check for duplicate pairs (two requests with identical URL fired within 50ms)
		for (let i = 0; i < transactionRequests.length - 1; i++) {
			const current = transactionRequests[i];
			const next = transactionRequests[i + 1];
			if (current.url === next.url) {
				const diff = next.timestamp - current.timestamp;
				expect(diff).toBeGreaterThan(100);
			}
		}
	});
});
