import { test, expect } from '@playwright/test';

test.describe('Transaction CRUD & Interactive Form Drawer', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/ledger');
		// Wait for ledger table or content to load
		await expect(page.locator('h1')).toContainText('Ledger Studio');
	});

	test('opens new transaction form from desktop header button and dismisses with ESC', async ({
		page
	}) => {
		const catatBtn = page.locator('button:has-text("Catat Transaksi")').first();
		await expect(catatBtn).toBeVisible();
		await catatBtn.click();

		// Drawer should slide in
		const drawer = page.locator('div[aria-labelledby="transaction-drawer-title"]');
		await expect(drawer).toBeVisible();
		await expect(page.locator('#transaction-drawer-title')).toContainText('Catat Transaksi');

		// Press ESC to close
		await page.keyboard.press('Escape');
		await expect(drawer).not.toBeVisible();
	});

	test('opens form via keyboard shortcut N', async ({ page }) => {
		const drawer = page.locator('div[aria-labelledby="transaction-drawer-title"]');
		await expect(drawer).not.toBeVisible();

		// Press 'n'
		await page.keyboard.press('n');
		await expect(drawer).toBeVisible();
		await expect(page.locator('#transaction-drawer-title')).toContainText('Catat Transaksi');

		// Close
		await page.keyboard.press('Escape');
		await expect(drawer).not.toBeVisible();
	});

	test('type switcher toggles form field visibility conditionally', async ({ page }) => {
		await page.keyboard.press('n');
		const drawer = page.locator('div[aria-labelledby="transaction-drawer-title"]');
		await expect(drawer).toBeVisible();

		// Default: Pengeluaran (Expense) -> Source Wallet, Category, Amount, Date, Planned
		await expect(page.locator('label[for="walletId"]')).toContainText('Dari Akun');
		await expect(page.locator('label[for="categoryId"]')).toBeVisible();
		await expect(page.locator('text=Rencana (Belum Terealisasi)')).toBeVisible();

		// Switch to Transfer -> Dual Wallets (Dari Akun & Ke Akun), Category hidden, Planned hidden
		await drawer.locator('#txn-type-label button:has-text("Transfer")').click();
		await expect(page.locator('label[for="sourceWalletId"]')).toBeVisible();
		await expect(page.locator('label[for="targetWalletId"]')).toBeVisible();
		await expect(page.locator('label[for="categoryId"]')).not.toBeVisible();
		await expect(page.locator('text=Rencana (Belum Terealisasi)')).not.toBeVisible();

		// Switch to Pemasukan (Income) -> Single Wallet (Ke Akun), Category visible, Planned visible
		await drawer.locator('#txn-type-label button:has-text("Pemasukan")').click();
		await expect(page.locator('label[for="walletId"]')).toContainText('Ke Akun');
		await expect(page.locator('label[for="categoryId"]')).toBeVisible();
		await expect(page.locator('text=Rencana (Belum Terealisasi)')).toBeVisible();

		await page.keyboard.press('Escape');
	});

	test('interacts with custom ComboboxSingleSelect and SingleDatePicker', async ({ page }) => {
		await page.keyboard.press('n');
		const drawer = page.locator('div[aria-labelledby="transaction-drawer-title"]');
		await expect(drawer).toBeVisible();

		// Open Wallet Combobox
		const walletTrigger = drawer.locator('button:has-text("Pilih akun...")');
		await expect(walletTrigger).toBeVisible();
		await walletTrigger.click();

		// Search in Combobox
		const searchInput = page.locator('#singleComboboxSearchInput');
		await expect(searchInput).toBeVisible();
		await searchInput.fill('BCA');

		// Select first filtered option
		const bcaOption = page.locator('button:has-text("BCA")').first();
		await expect(bcaOption).toBeVisible();
		await bcaOption.click();

		// Combobox should close and trigger button should show BCA
		await expect(searchInput).not.toBeVisible();
		await expect(drawer.locator('button:has-text("BCA")')).toBeVisible();

		// Open Single DatePicker
		const datePickerBtn = drawer
			.locator('button:has(svg)')
			.filter({ hasText: /\d{2}\s\w{3}\s\d{4}|Pilih tanggal/ });
		await expect(datePickerBtn).toBeVisible();
		await datePickerBtn.click();

		// Datepicker popover should be open
		await expect(page.locator('text=Hari Ini')).toBeVisible();
		await page.locator('button:has-text("Hari Ini")').click();

		// Popover should close
		await expect(page.locator('text=Hari Ini')).not.toBeVisible();

		await page.keyboard.press('Escape');
	});

	test('shows client-side validation errors when submitting incomplete form', async ({ page }) => {
		await page.keyboard.press('n');

		// Click submit directly
		await page.locator('button[type="submit"]:has-text("Catat Transaksi")').click();

		// Expect validation messages
		await expect(page.locator('text=Pilih akun sumber')).toBeVisible();
		await expect(page.locator('text=Nominal harus lebih dari 0')).toBeVisible();

		await page.keyboard.press('Escape');
	});

	test('clicks ledger row to open detail view, transitions to edit mode, and cancels', async ({
		page
	}) => {
		// Wait for table rows to be rendered
		const firstRow = page.locator('tbody tr').first();
		await expect(firstRow).toBeVisible();

		// Click row
		await firstRow.click();

		// Drawer should open in view mode
		const drawer = page.locator('div[aria-labelledby="transaction-drawer-title"]');
		await expect(drawer).toBeVisible();
		await expect(drawer.locator('text=Detail Transaksi')).toBeVisible();

		// Action buttons in detail view
		const editBtn = drawer.locator('button:has-text("Edit Transaksi")');
		const deleteBtn = drawer.locator('button:has-text("Hapus")');
		await expect(editBtn).toBeVisible();
		await expect(deleteBtn).toBeVisible();

		// Click Edit -> switches to Edit Mode
		await editBtn.click();
		await expect(drawer.locator('text=Edit Transaksi')).toBeVisible();
		await expect(drawer.locator('#amount')).toBeVisible();
		await expect(drawer.locator('button:has-text("Simpan Perubahan")')).toBeVisible();

		// Click Batal in edit mode -> reverts to View Mode
		await drawer.locator('button:has-text("Batal")').click();
		await expect(drawer.locator('text=Detail Transaksi')).toBeVisible();
		await expect(editBtn).toBeVisible();

		// Press ESC to close drawer
		await page.keyboard.press('Escape');
		await expect(drawer).not.toBeVisible();
	});

	test('clicking delete in detail view opens confirmation dialog', async ({ page }) => {
		const firstRow = page.locator('tbody tr').first();
		await expect(firstRow).toBeVisible();
		await firstRow.click();

		const drawer = page.locator('div[aria-labelledby="transaction-drawer-title"]');
		await expect(drawer).toBeVisible();

		// Click Hapus
		await drawer.locator('button:has-text("Hapus")').click();

		// Modal confirmation should appear
		const modal = page.locator('div[role="dialog"][aria-labelledby="delete-dialog-title"]');
		await expect(modal).toBeVisible();
		await expect(modal.locator('#delete-dialog-title')).toContainText('Hapus Transaksi Ini?');
		await expect(modal.locator('text=Saldo akun akan disesuaikan secara otomatis')).toBeVisible();

		// Cancel deletion
		await modal.locator('button:has-text("Batal")').click();
		await expect(modal).not.toBeVisible();

		// Drawer still in view mode
		await expect(drawer).toBeVisible();
		await page.keyboard.press('Escape');
	});
});
