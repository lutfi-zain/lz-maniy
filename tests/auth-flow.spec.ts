import { test, expect } from '@playwright/test';

test.describe('Authentication & Zero-Click Google OAuth PKCE Flow', () => {
	// Isolate to clean, unauthenticated browser storage
	test.use({ storageState: { cookies: [], origins: [] } });

	test('unauthenticated visitor is redirected to /login when visiting protected studio', async ({
		page
	}) => {
		await page.goto('/ledger');

		// Guard should redirect to /login
		await expect(page).toHaveURL(/\/login/);
		await expect(page.locator('h1')).toContainText('Maniyy Workspace');
		await expect(page.locator('button:has-text("Lanjutkan dengan Google")')).toBeVisible();
	});

	test('login page displays minimalist-ui styling and Google PKCE button', async ({ page }) => {
		await page.goto('/login');

		// Typography and card container checks
		await expect(page.locator('h1')).toHaveClass(/font-serif/);
		await expect(page.locator('text=Zero-Click Direct Redirect · PKCE S256 TLS 1.3')).toBeVisible();

		// Check discreet API key link
		const devLink = page.locator('button:has-text("masuk dengan api key")');
		await expect(devLink).toBeVisible();
	});

	test('clicking Lanjutkan dengan Google sets PKCE and triggers Google OAuth navigation', async ({
		page
	}) => {
		await page.goto('/login');

		await page.route('**/oauth/authorize*', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'text/html',
				body: '<html><body>Mock OAuth</body></html>'
			});
		});

		const reqPromise = page.waitForRequest((req) => req.url().includes('provider=google'));
		await page.locator('button:has-text("Lanjutkan dengan Google")').click();
		const req = await reqPromise;

		expect(req.url()).toContain('provider=google');
		expect(req.url()).toContain('response_type=code');
		expect(req.url()).toContain('code_challenge_method=S256');
		expect(req.url()).toContain('client_id=maniyy-web');
		expect(req.url()).toContain('redirect_uri=');
		expect(req.url()).toContain('state=');
	});
	test('developer mode allows manual API key entry and navigates to cockpit', async ({ page }) => {
		await page.goto('/login');

		// Open dev input
		await page.locator('button:has-text("masuk dengan api key")').click();

		// Fill manual API key
		const keyInput = page.locator('input[placeholder*="fp_live"]');
		await keyInput.fill('fp_live_test_sandbox_12345');
		await page.locator('button:has-text("Gunakan Token")').click();

		// Must navigate to / and display user profile
		await expect(page).toHaveURL('/');
		await expect(page.getByRole('link', { name: 'Maniyy' })).toBeVisible();
	});

	test('authenticated user can logout via Topbar menu and is redirected to /login', async ({
		page
	}) => {
		// Log in using developer token first
		await page.goto('/login');
		await page.locator('button:has-text("masuk dengan api key")').click();
		await page.locator('input[placeholder*="fp_live"]').fill('fp_live_test_logout');
		await page.locator('button:has-text("Gunakan Token")').click();
		await expect(page).toHaveURL('/');

		// Open Topbar user menu
		const userAvatarBtn = page.getByRole('button', { name: 'Profil Pengguna' });
		await expect(userAvatarBtn).toBeVisible();
		await userAvatarBtn.click();

		// Click logout
		const logoutBtn = page.getByRole('button', { name: /Keluar/ });
		await expect(logoutBtn).toBeVisible();
		await logoutBtn.click();

		// Must redirect to /login
		await expect(page).toHaveURL(/\/login/);

		// Local storage must be cleared
		const token = await page.evaluate(() => localStorage.getItem('reedrich_access_token'));
		expect(token).toBeNull();
	});
});
