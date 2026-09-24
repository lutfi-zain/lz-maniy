import { test, expect } from '@playwright/test';

test.describe('Ledger Studio Dynamic Filtering Engine', () => {
	test('filters transactions by search and updates live aggregate strip', async ({ page }) => {
		await page.goto('/ledger');

		// Check search input exists
		const searchInput = page.locator('#ledgerSearch');
		await expect(searchInput).toBeVisible();

		// Search for Point Coffee
		await searchInput.fill('point coffee');
		await expect(page.getByText('Point Coffee untuk suami')).toBeVisible();

		// Clear search
		await searchInput.fill('');

		// Filter by Type: Pengeluaran
		const expenseBtn = page.getByRole('button', { name: 'Pengeluaran' });
		await expenseBtn.click();

		// Verify aggregate strip displays amounts
		const aggStrip = page.locator('text=dalam filter aktif');
		await expect(aggStrip).toBeVisible();

		// Reset filters
		const resetBtn = page.getByRole('button', { name: 'Reset Filter' });
		await resetBtn.click();
		await expect(searchInput).toHaveValue('');
	});
});
