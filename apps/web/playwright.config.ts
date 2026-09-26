import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: 'tests',
	testMatch: /.*\.spec\.ts/,
	webServer: {
		command: 'bun run build && bun run preview --port 4173',
		port: 4173,
		reuseExistingServer: !process.env.CI
	},
	use: {
		baseURL: 'http://localhost:4173',
		trace: 'on-first-retry',
		storageState: {
			cookies: [],
			origins: [
				{
					origin: 'http://localhost:4173',
					localStorage: [
						{
							name: 'reedrich_access_token',
							value: '$REEDRICH_API_TOKEN'
						},
						{
							name: 'reedrich_expires_at',
							value: '2524608000000'
						},
						{
							name: 'reedrich_user',
							value: '{"name":"Lutfi Zain","email":"lutfi@reedrich.dev"}'
						}
					]
				}
			]
		}
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	]
});
