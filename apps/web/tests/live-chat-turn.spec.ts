import { test, expect } from '@playwright/test';

test.describe('Live Agent Multi-Turn Forward Projection & Error Immunity', () => {
	test.beforeEach(async ({ page }) => {
		// Mock models list
		await page.route('**/api/models', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([
					{
						provider: 'omp',
						model: 'google-antigravity/gemini-3.8-flash',
						displayName: 'Gemini 3.8 Flash (Primary)',
						capabilities: { vision: true, tool_calling: true, thinking: true },
						thinkingLevels: ['off', 'minimal', 'low', 'medium', 'high']
					}
				])
			});
		});

		// Mock user balance and cockpit snapshot
		await page.route('**/api/v1/account-detail', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					netWorth: { consolidated: { total: 14422263, currency: 'IDR' }, byCurrency: {} },
					wallets: {
						spendable: { total: 185543, items: [] },
						locked: { total: 14236720, items: [] }
					},
					monthlyCashFlow: { categoryBreakdown: [] }
				})
			});
		});
	});

	test('renders assistant forward projection answer without MALFORMED or error alerts', async ({ page }) => {
		// Mock live chat SSE stream returning successful synthesis
		await page.route('**/api/chat', async (route) => {
			if (route.request().method() === 'POST') {
				const ssePayload = [
					'0:"Berdasarkan proyeksi arus kas Anda, DP mobil 50 juta idealnya dieksekusi pada bulan November 2027."',
					'd:{"finishReason":"stop","usage":{"promptTokens":120,"completionTokens":45}}'
				].join('\n\n') + '\n\n';

				await route.fulfill({
					status: 200,
					contentType: 'text/plain; charset=utf-8',
					headers: {
						'X-Conversation-Id': 'conv-test-123',
						'X-Is-New-Conversation': '0'
					},
					body: ssePayload
				});
				return;
			}
			await route.continue();
		});

		await page.goto('/');

		// Open chat panel
		const chatBtn = page.getByRole('button', { name: /Buka Agent Chat/i });
		await expect(chatBtn).toBeVisible();
		await chatBtn.click();

		const textarea = page.locator('textarea[data-chat-input]');
		await expect(textarea).toBeVisible();

		// Submit multi-month simulation question
		await textarea.fill('kalau saya mau beli mobil lagi tahun depan dengan DP50 juta bisa di bulan apa idealnya?');
		await page.keyboard.press('Enter');

		// Verify assistant message appears
		const assistantBubble = page.locator('text=DP mobil 50 juta idealnya dieksekusi pada bulan November 2027');
		await expect(assistantBubble).toBeVisible({ timeout: 10000 });

		// Strict assertions: No error banners or technical keywords
		const errorBanner = page.locator('text=MALFORMED_FUNCTION_CALL');
		await expect(errorBanner).toHaveCount(0);

		const generalError = page.locator('text=⚠️ Generation failed');
		await expect(generalError).toHaveCount(0);
	});
});
