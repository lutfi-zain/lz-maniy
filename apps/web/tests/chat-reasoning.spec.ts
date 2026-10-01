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
						provider: 'gemini',
						model: 'gemini-3.7-flash',
						displayName: 'Gemini 3.7 Flash',
						capabilities: { vision: true, tool_calling: true, thinking: true },
						thinkingLevels: ['off', 'minimal', 'low', 'medium', 'high']
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

	test('displays active models in model picker and switches model', async ({ page }) => {
		await page.goto('/');

		// Open chat panel
		await page.getByRole('button', { name: /Buka Agent Chat/i }).click();

		// Open model selector
		const modelBtn = page.getByRole('button', { name: 'Pilih model AI' });
		await expect(modelBtn).toBeVisible();
		await modelBtn.click();

		// Check Google Gemini section header and Groq section header
		const geminiHeader = page.getByText('Google Gemini');
		await expect(geminiHeader).toBeVisible();

		const groqModel = page.getByText('GPT-OSS 20B (Groq Fast)');
		await expect(groqModel).toBeVisible();
		await groqModel.click();

		// Verify model selector button displays selected model
		await expect(modelBtn).toContainText('GPT-OSS 20B');
	});
});
