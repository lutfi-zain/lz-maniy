import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: 'tests',
	testMatch: /.*\.spec\.ts/,
	testIgnore: ['**/integration/**'],
	webServer: {
		command: 'bun run build && bun run preview --port 4173',
		port: 4173,
		reuseExistingServer: !process.env.CI
	},
	use: {
		baseURL: 'http://localhost:4173',
		trace: 'on-first-retry',
		storageState: process.env.REEDRICH_TEST_API_TOKEN || process.env.TEST_TOKEN
			? {
					cookies: [],
					origins: [
						{
							origin: 'http://localhost:4173',
							localStorage: [
								{
									name: 'reedrich_access_token',
									value: process.env.REEDRICH_TEST_API_TOKEN || process.env.TEST_TOKEN || ''
								},
								{
									name: 'reedrich_expires_at',
									value: '2524608000000'
								},
								{
									name: 'reedrich_user',
									value:
										process.env.REEDRICH_TEST_USER_INFO ||
										'{"name":"Maniyy TestBot","email":"testbot@maniyy.dev","id":"usr_muhwbsfe_722e117da986448e"}'
								}
							]
						}
					]
				}
			: undefined
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	]
});
