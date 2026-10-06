import { test, expect } from '@playwright/test';

test.describe('Agent Statement Import Attach Journey', () => {
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem('reedrich_access_token', 'e2e-test-token');
			localStorage.setItem('reedrich_expires_at', '2524608000000');
			localStorage.setItem(
				'reedrich_user',
				'{"name":"Maniyy TestBot","email":"testbot@maniyy.dev","id":"usr_test"}'
			);
		});
		await page.route('**/api/models', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([
					{
						provider: 'gemini',
						model: 'gemini-3.7-flash',
						displayName: 'Gemini 3.7 Flash',
						capabilities: { vision: true, tool_calling: true, thinking: true },
						thinkingLevels: ['off', 'low', 'medium', 'high']
					}
				])
			});
		});
		await page.route('**/api/statements/parse', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					sessionId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
					files: [
						{
							fileName: 'bca.pdf',
							status: 'ready',
							pageCount: 12,
							rowCount: 87,
							bank: 'BCA'
						}
					],
					totalPages: 12,
					totalRows: 87
				})
			});
		});
	});

	test('attaches PDF and shows parse status with size summary', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: /Buka Agent Chat/i }).click();
		const textarea = page.locator('textarea[data-chat-input]');
		await expect(textarea).toBeVisible();

		const pdfBuffer = Buffer.from(
			'%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\ntrailer<</Root 1 0 R>>'
		);
		await page.locator('input[type="file"][accept="application/pdf,.pdf"]').setInputFiles([
			{ name: 'bca.pdf', mimeType: 'application/pdf', buffer: pdfBuffer }
		]);

		await expect(page.getByText('bca.pdf')).toBeVisible();
		await expect(page.getByText('12 hlm · 87 baris · BCA')).toBeVisible();
		await expect(page.getByText('1 file · 12 hlm · 87 baris siap dianalisis')).toBeVisible();
	});

	test('sends message carrying only the session reference', async ({ page }) => {
		let chatBody: Record<string, unknown> | null = null;
		await page.route('**/api/chat', (route) => {
			chatBody = route.request().postDataJSON() as Record<string, unknown>;
			route.fulfill({
				status: 200,
				contentType: 'text/plain; charset=utf-8',
				body: 'f:{"messageId":"msg-1"}\n0:"ok"\n',
				headers: {
					'X-Conversation-Id': 'conv-1',
					'X-Is-New-Conversation': '1',
					'Access-Control-Expose-Headers': 'X-Conversation-Id, X-Is-New-Conversation'
				}
			});
		});

		await page.goto('/');
		await page.getByRole('button', { name: /Buka Agent Chat/i }).click();

		const pdfBuffer = Buffer.from(
			'%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\ntrailer<</Root 1 0 R>>'
		);
		await page.locator('input[type="file"][accept="application/pdf,.pdf"]').setInputFiles([
			{ name: 'bca.pdf', mimeType: 'application/pdf', buffer: pdfBuffer }
		]);
		await expect(page.getByText('12 hlm · 87 baris · BCA')).toBeVisible();

		await page.locator('textarea[data-chat-input]').fill('Ringkas mutasi bulan ini');
		await page.getByRole('button', { name: 'Kirim pesan' }).click();
		await page.waitForTimeout(500);

		expect(chatBody).not.toBeNull();
		expect(chatBody?.statementSessionId).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
		expect(JSON.stringify(chatBody)).not.toContain('%PDF');
	});
});
