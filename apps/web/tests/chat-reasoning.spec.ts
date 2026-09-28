import { test, expect } from '@playwright/test';

test.describe('Agent Chat Reasoning & UI Enhancements', () => {
	test.beforeEach(async ({ page }) => {
		await page.route('**/api/models', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([
					{
						provider: 'gemini',
						model: 'gemini-3.1-flash-lite',
						displayName: 'Gemini 3.1 Flash Lite',
						capabilities: { vision: true, tool_calling: true, thinking: true },
						thinkingLevels: ['off', 'minimal', 'low', 'medium', 'high']
					},
					{
						provider: 'opencode',
						model: 'muse-spark-1.3-contributor-free',
						displayName: 'Muse Spark 1.3 Free (OpenCode)',
						capabilities: { vision: true, tool_calling: true, thinking: true },
						thinkingLevels: ['off', 'low', 'medium', 'high', 'xhigh']
					},
					{
						provider: 'groq',
						model: 'openai/gpt-oss-20b',
						displayName: 'GPT-OSS 20B (Groq Fast)',
						capabilities: { vision: false, tool_calling: true }
					}
				])
			});
		});
	});

	test('opens chat panel and auto-focuses textarea input on desktop', async ({ page }) => {
		await page.goto('/');

		const chatBtn = page.getByRole('button', { name: /Buka Agent Chat/i });
		await expect(chatBtn).toBeVisible();
		await chatBtn.click();
		const textarea = page.locator('textarea[data-chat-input]');
		await expect(textarea).toBeVisible();
		await expect(textarea).toBeFocused();
	});

	test('toggles thinking level on reasoning models', async ({ page }) => {
		await page.goto('/');

		// Open chat panel
		await page.getByRole('button', { name: /Buka Agent Chat/i }).click();

		// Default selected model is Gemini 3.1 Flash Lite which supports thinking
		const thinkingBtn = page.getByRole('button', { name: 'Atur Thinking Level' });
		await expect(thinkingBtn).toBeVisible();
		await expect(thinkingBtn).toContainText('low');
		await page.waitForTimeout(400);

		// Open thinking popover and switch to high
		await thinkingBtn.click();
		const highBtn = page.getByRole('button', { name: 'High' });
		await expect(highBtn).toBeVisible();
		await highBtn.click();

		// Verify updated thinking level label
		await expect(thinkingBtn).toContainText('high');
	});

	test('displays OpenCode models in model picker and switches model', async ({ page }) => {
		await page.goto('/');

		// Open chat panel
		await page.getByRole('button', { name: /Buka Agent Chat/i }).click();

		// Open model selector
		const modelBtn = page.getByRole('button', { name: 'Pilih model AI' });
		await expect(modelBtn).toBeVisible();
		await modelBtn.click();

		// Check OpenCode Zen section header and Muse Spark
		const opencodeHeader = page.getByText('OpenCode Zen (Public Tier)');
		await expect(opencodeHeader).toBeVisible();

		const museModel = page.getByText('Muse Spark 1.3 Free (OpenCode)');
		await expect(museModel).toBeVisible();
		await museModel.click();

		// Verify model selector button displays Muse Spark
		await expect(modelBtn).toContainText('Muse Spark 1.3 Free');

		// Since Muse Spark supports thinking, thinking selector remains visible
		const thinkingBtn = page.getByRole('button', { name: 'Atur Thinking Level' });
		await expect(thinkingBtn).toBeVisible();
	});
});
