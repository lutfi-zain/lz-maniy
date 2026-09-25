# Tasks

## 1. Transaction Form Store & Mutation Types

- [x] 1.1 Define TypeScript payload interfaces in `src/lib/types/account-detail.ts`: `CreateTransactionPayload` (walletId, categoryId, amount, type, date, optional: budgetId, adminFee, description, isPlanned, transactionDate), `CreateTransferPayload` (sourceWalletId, targetWalletId, amount, optional: adminFee, description, categoryId, date), `UpdateTransactionPayload` (all fields optional except transactionId)
- [x] 1.2 Create `src/lib/stores/transaction-form.svelte.ts` with `TransactionFormStore` class: `isOpen`, `mode` (create/edit/view), `transactionType` (expense/income/transfer), `existingTransaction`, `isSaving`, `error`, form field states (walletId, targetWalletId, categoryId, budgetId, amount, adminFee, description, date, isPlanned), `openCreate()`, `openView(transaction)`, `openEdit(transaction)`, `close()`, `resetFields()`, validation derived states
- [x] 1.3 Add mutation methods to `ReedrichStore` in `src/lib/stores/reedrich.svelte.ts`: `createTransaction(payload)`, `createTransfer(payload)`, `updateTransaction(id, delta)`, `deleteTransaction(id)`, and private `invalidateAndRefresh()` that clears `transactionCache`, resets `allTransactions` to `[]`, and calls `fetchSnapshot()`
- [x] 1.4 Write Vitest unit tests in `src/lib/stores/transaction-form.test.ts`: test `openCreate()` sets mode/defaults, `openView()` populates existingTransaction, `openEdit()` populates form fields from transaction, `close()` resets all state, field preservation on type switch, validation state derivation
- [x] 1.5 Write Vitest unit tests in `src/lib/stores/reedrich.test.ts` (extend existing): mock `createTransaction`, `createTransfer`, `updateTransaction`, `deleteTransaction` verifying API call shape, cache invalidation, and error propagation

## 2. Transaction Form Drawer Component

- [x] 2.1 Create `src/lib/components/transaction/TransactionFormDrawer.svelte`: slide-over drawer (same visual pattern as DrilldownDrawer — 620px max-width, right-aligned, z-50, backdrop blur, ESC dismiss), importing `transactionFormStore` for open/close state
- [x] 2.2 Implement three-way type switcher (inline toggle buttons: Pengeluaran / Pemasukan / Transfer) with `bg-[#111111] text-white` active state, `border border-[#EAEAEA]` inactive state
- [x] 2.3 Implement conditional form fields: wallet selector (grouped by institution, showing name + balance), category combobox (filtered by transaction type), amount input with `Rp` prefix, admin fee input, date picker (defaulting to today), description textarea, planned checkbox (hidden for transfer), budget selector (visible only for expense when budgets exist)
- [x] 2.4 Implement target wallet selector for transfer type (excludes source wallet from options)
- [x] 2.5 Implement form submission: build payload from form state, call `reedrichStore.createTransaction()` or `reedrichStore.createTransfer()` based on type, show inline error on failure, close drawer and show success notification on success
- [x] 2.6 Implement client-side field validation: required wallet, required category (expense/income), required positive amount, required date; display inline error messages per field using `data-invalid` pattern

## 3. Transaction Detail View Mode

- [x] 3.1 Create `src/lib/components/transaction/TransactionDetailView.svelte`: read-only detail layout showing date, description, category name, wallet name(s), amount (formatted with currency), admin fee, type badge (color-coded), planned/realized status, budget name (if linked); transfer transactions show source → target wallet routing
- [x] 3.2 Add `[Edit]` and `[Hapus]` action buttons at the bottom of the detail view; `[Edit]` calls `transactionFormStore.openEdit(transaction)`, `[Hapus]` triggers delete confirmation dialog
- [x] 3.3 Implement delete confirmation dialog: centered modal overlay with `border: 1px solid #EAEAEA`, max-width 400px, showing transaction description and amount, warning text "Saldo akun akan disesuaikan secara otomatis", `[Batal]` secondary button and `[Hapus]` destructive button (`bg-[#9F2F2D] text-white`); on confirm calls `reedrichStore.deleteTransaction(id)`, closes drawer on success

## 4. Edit Mode & View-Edit Transition

- [x] 4.1 Implement view → edit mode transition in `TransactionFormDrawer.svelte`: when `transactionFormStore.mode` is `'edit'`, render form fields pre-populated with `existingTransaction` values; header shows "Edit Transaksi"; action bar shows `[Simpan]` and `[Batal]`
- [x] 4.2 Implement edit submission: build delta payload from changed fields only, call `reedrichStore.updateTransaction(id, delta)`, on success revert drawer to view mode with updated data
- [x] 4.3 Handle transfer edit restrictions: when editing a transfer transaction, lock the type switcher to `Transfer` and disable wallet selectors (source/target wallet cannot be changed via PATCH)
- [x] 5.1 Add `[+ Catat]` button to `Topbar.svelte` between the Sync button and Live/Mock status: `Plus` phosphor icon, `border border-[#EAEAEA] bg-white text-xs font-medium`, hidden on mobile (`hidden md:flex`), onclick calls `transactionFormStore.openCreate()`
- [x] 5.2 Add center action button to `BottomNav.svelte` between Ledger and Akun tabs: `bg-[#111111] text-white rounded-lg size-10` with `Plus` icon, raised `-mt-4` from baseline, no label, onclick calls `transactionFormStore.openCreate()`
- [x] 5.3 Mount `TransactionFormDrawer` in `src/routes/+layout.svelte` inside the protected app shell (after `BottomNav`, before closing `</div>`)
- [x] 5.4 Add keyboard shortcut listener in `+layout.svelte`: on `keydown` `N`/`n` when target is not input/textarea/contenteditable and form drawer is not already open, call `transactionFormStore.openCreate()`

## 6. Ledger Row Click-to-Detail
- [x] 6.1 Add click handler to transaction rows in `src/routes/ledger/+page.svelte` desktop table: `onclick` on `<tr>` calls `transactionFormStore.openView(transaction)`, add `cursor-pointer` and hover highlight
- [x] 6.2 Add click handler to transaction items in ledger mobile feed: `onclick` on the mobile `<div>` item calls `transactionFormStore.openView(transaction)`
- [x] 6.3 Add `[+ Catat]` button to ledger page header (desktop): small button next to the "Ledger Studio" heading, onclick calls `transactionFormStore.openCreate()`

## 7. Testing & Validation

- [x] 7.1 Create Playwright e2e test `tests/transaction-crud.spec.ts`: test new transaction creation (fill form, submit, verify ledger updates), test opening detail view from ledger row click, test edit mode transition and save, test delete with confirmation
- [x] 7.2 Run full test suite: `bun test` (Vitest) + `bunx playwright test` + `bun run check` (svelte-check) + `bun run lint`
