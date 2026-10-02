/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: 'tests/integration',
	testMatch: /.*\.spec\.ts/,
	fullyParallel: false,
	workers: 1,
	retries: 0,
	timeout: 120000,
	webServer: {
		command: 'bun run build && bun run preview --port 4173',
		port: 4173,
		reuseExistingServer: !process.env.CI
	},
	use: {
		baseURL: 'http://localhost:4173',
		trace: 'off',
		video: 'off',
		screenshot: 'only-on-failure'
	},
	projects: [
		{
			name: 'integration-desktop',
			use: { ...devices['Desktop Chrome'] }
		}
	],
	reporter: [['list']]
});
