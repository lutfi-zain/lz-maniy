import { test, expect } from '@playwright/test';

test.describe('Planning Studio to Filtered Ledger Drilldowns', () => {
	test('drills down from Budget card in Planning to filtered Ledger with active budget chip', async ({
		page
	}) => {
		await page.goto('/planning');

		// Switch to Pagu Anggaran sub-tab
		const budgetTabBtn = page.getByRole('button', { name: /Pagu Anggaran/ });
		await expect(budgetTabBtn).toBeVisible();
		await budgetTabBtn.click();

		// Find first budget card with "Lihat Transaksi →"
		const lihatTransaksiLink = page.locator('a:has-text("Lihat Transaksi →")').first();
		await expect(lihatTransaksiLink).toBeVisible();
		await lihatTransaksiLink.click();

		// Should navigate to /ledger with budgetId in URL
		await expect(page).toHaveURL(/\/ledger\?budgetId=/);
		await expect(page.locator('h1')).toContainText('Ledger Studio');

		// Active budget chip must be visible
		const activeChip = page.locator('text=Pagu Anggaran Aktif:');
		await expect(activeChip).toBeVisible();

		// Dismiss the budget chip by clicking "x"
		const dismissBtn = page.getByRole('button', { name: 'Hapus filter anggaran' }).first();
		await expect(dismissBtn).toBeVisible();
		await dismissBtn.click();

		// Active chip should disappear
		await expect(activeChip).not.toBeVisible();
	});

	test('drills down from Savings Goal linked wallet to Ledger filtered by walletId', async ({
		page
	}) => {
		await page.goto('/planning');

		// Goals is default sub-tab, find first "Mutasi →" link
		const mutasiWalletLink = page.locator('a[href*="/ledger?walletId="]').first();
		await expect(mutasiWalletLink).toBeVisible();
		await mutasiWalletLink.click();

		// Should navigate to /ledger with walletId parameter
		await expect(page).toHaveURL(/\/ledger\?walletId=/);
		await expect(page.locator('h1')).toContainText('Ledger Studio');
	});

	test('drills down from Recurring Templates in Planning to Ledger filtered by search keyword', async ({
		page
	}) => {
		await page.goto('/planning');

		// Switch to Kewajiban & Rutin tab
		await page.getByRole('button', { name: /Kewajiban & Rutin/ }).click();

		// Find first "Mutasi →" in recurring templates table
		const mutasiRecurringLink = page.locator('a[href*="/ledger?search="]').first();
		await expect(mutasiRecurringLink).toBeVisible();
		await mutasiRecurringLink.click();

		// Should navigate to /ledger with search parameter
		await expect(page).toHaveURL(/\/ledger\?search=/);
		await expect(page.locator('h1')).toContainText('Ledger Studio');
	});
});
