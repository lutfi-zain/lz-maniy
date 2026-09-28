# Tasks

## 1. Shared Types & Payload Interfaces

- [x] 1.1 Add CRUD payload interfaces to `packages/shared/src/account-detail.ts`: `CreateWalletPayload`, `UpdateWalletPayload`, `CreateCategoryPayload`, `UpdateCategoryPayload`, `CreateBudgetPayload`, `UpdateBudgetPayload`, `CreateGoalPayload`, `UpdateGoalPayload`, `ContributeGoalPayload`, `RecurringTemplate`, `CreateRecurringTemplatePayload`, `UpdateRecurringTemplatePayload`, `ApplyRecurringTemplatePayload`, `UpdateProfilePayload`. Extend `DrawerType` with `'wallet-form' | 'category-form' | 'budget-form' | 'goal-form' | 'recurring-detail' | 'recurring-form' | 'profile-form'`. Verify: `bun run --cwd packages/shared check` passes.

## 2. ReedrichStore CRUD Methods

- [x] 2.1 Add wallet CRUD methods to `ReedrichStore`: `createWallet(payload)`, `updateWallet(id, delta)`, `deleteWallet(id)`. Each calls the Reedrich REST endpoint, handles errors, and calls `invalidateAndRefresh()` on success. Verify: `bun run --cwd apps/web check` passes.
- [x] 2.2 Add category CRUD methods: `createCategory(payload)`, `updateCategory(id, delta)`, `deleteCategory(id)`. Same pattern. Verify: type check passes.
- [x] 2.3 Add budget CRUD methods: `createBudget(payload)`, `updateBudget(id, delta)`, `deleteBudget(id)`. Same pattern. Verify: type check passes.
- [x] 2.4 Add goal CRUD methods: `createGoal(payload)`, `updateGoal(id, delta)`, `deleteGoal(id)`, `contributeToGoal(id, payload)`, `linkGoalWallet(goalId, walletId)`, `unlinkGoalWallet(goalId, walletId)`. Verify: type check passes.
- [x] 2.5 Add recurring template state and CRUD methods: `recurringTemplates = $state([])`, `isRecurringLoading = $state(false)`, `fetchRecurringTemplates()`, `createRecurringTemplate(payload)`, `updateRecurringTemplate(id, delta)`, `deleteRecurringTemplate(id)`, `applyRecurringTemplate(id, payload?)`. Verify: type check passes.
- [x] 2.6 Add profile update method: `updateProfile(delta)` calling `PATCH /api/v1/me`. Verify: type check passes.

## 3. Form Stores

- [x] 3.1 Create `apps/web/src/lib/stores/wallet-form.svelte.ts` with `WalletFormStore` following `TransactionFormStore` pattern: `$state` fields (name, institution, type, balance, currency, isLocked), `$derived` isValid, `openCreate()`, `openEdit(wallet)`, `close()`, `resetFields()`. Export singleton `walletFormStore`. Verify: type check passes.
- [x] 3.2 Create `category-form.svelte.ts` with `CategoryFormStore`: fields (name, type, icon), validation (name required). Verify: type check.
- [x] 3.3 Create `budget-form.svelte.ts` with `BudgetFormStore`: fields (name, amount, periodStart, periodEnd, categoryId), validation (amount > 0, periodEnd >= periodStart). Verify: type check.
- [x] 3.4 Create `goal-form.svelte.ts` with `GoalFormStore`: fields (name, targetAmount, currentAmount, currency, targetDate, walletIds[], categoryId, notes, status), validation (name required, targetAmount > 0). Verify: type check.
- [x] 3.5 Create `recurring-form.svelte.ts` with `RecurringFormStore`: fields (name, walletId, categoryId, amount, type, frequency, interval, startDate, endDate, notes, isActive), validation (name required, amount > 0, walletId required, startDate required, endDate >= startDate if set). Verify: type check.

## 4. Form Drawer Components

- [x] 4.1 Create `apps/web/src/lib/components/drawer/WalletFormContent.svelte`: create/edit form with fields for name, institution (text input), type (select: bank/cash/e-wallet/credit/crypto/investment), balance (number input), currency (text input, default IDR), isLocked (toggle). Submit calls `reedrichStore.createWallet()` or `updateWallet()`. Uses `walletFormStore`. Verify: `bun run --cwd apps/web check` passes.
- [x] 4.2 Create `CategoryFormContent.svelte`: create/edit form with name (text), type (select: expense/income, disabled in edit mode), icon (text/emoji input). Submit calls `createCategory()` or `updateCategory()`. Verify: type check.
- [x] 4.3 Create `BudgetFormContent.svelte`: create/edit form with name (text), amount (number), periodStart/periodEnd (SingleDatePicker), categoryId (ComboboxSingleSelect from reedrichStore.categories). Submit calls `createBudget()` or `updateBudget()`. Verify: type check.
- [x] 4.4 Create `GoalFormContent.svelte`: create/edit form with name, targetAmount, currentAmount (disabled if derived), currency, targetDate (SingleDatePicker), categoryId (ComboboxSingleSelect), walletIds (multi-select from allWallets), notes (textarea), status (select, edit only). Submit calls `createGoal()` or `updateGoal()`. Verify: type check.
- [x] 4.5 Create `RecurringDetailContent.svelte`: read-only detail view showing template name, wallet, category, amount, type, frequency, interval, nextRunDate, startDate, endDate, notes, isActive status. Action toolbar: Edit, Hapus, Terapkan (Apply). Verify: type check.
- [x] 4.6 Create `RecurringFormContent.svelte`: create/edit form with name, walletId (ComboboxSingleSelect), categoryId (ComboboxSingleSelect), amount, type (select), frequency (select), interval (number), startDate (SingleDatePicker), endDate (SingleDatePicker, optional), notes, isActive (toggle). Submit calls `createRecurringTemplate()` or `updateRecurringTemplate()`. Verify: type check.
- [x] 4.7 Create `ProfileFormContent.svelte`: edit form with firstName, lastName, whatsappNumber. Pre-populate from `authStore.userProfile`. Submit calls `reedrichStore.updateProfile()`. Verify: type check.

## 5. Drawer Integration & Detail Drawer Enhancements

- [x] 5.1 Update `DrilldownDrawer.svelte`: import new form/detail components, add `{:else if}` branches for `wallet-form`, `category-form`, `budget-form`, `goal-form`, `recurring-detail`, `recurring-form`, `profile-form` drawer types. Verify: `bun run --cwd apps/web check` passes.
- [x] 5.2 Add Edit/Delete action toolbar to `WalletDrawerContent.svelte`: "Edit" opens `wallet-form` drawer, "Hapus" shows inline confirmation then calls `deleteWallet()`. Verify: type check.
- [x] 5.3 Add Edit/Delete toolbar to `CategoryDrawerContent.svelte`. Verify: type check.
- [x] 5.4 Add Edit/Delete toolbar to `BudgetDrawerContent.svelte`. Verify: type check.
- [x] 5.5 Add Edit/Delete/Contribute/Link Wallet toolbar to `GoalDrawerContent.svelte`: "Setor" opens contribute dialog, wallet link/unlink actions. Verify: type check.

## 6. Page Integration

- [x] 6.1 Add "+ Tambah Dompet" button to `/accounts` page toolbar. Clicking opens `wallet-form` drawer in create mode. Verify: `bun run --cwd apps/web build` succeeds.
- [x] 6.2 Add "+ Tambah Kategori" button to cockpit or planning category section. Clicking opens `category-form` drawer. Verify: build succeeds.
- [x] 6.3 Add "+ Tambah Budget" button to `/planning` budgets tab. Clicking opens `budget-form` drawer. Verify: build succeeds.
- [x] 6.4 Add "+ Buat Target" button to `/planning` goals tab. Clicking opens `goal-form` drawer. Verify: build succeeds.
- [x] 6.5 Replace hardcoded mock `recurringTemplates` array in `/planning/+page.svelte` with `reedrichStore.recurringTemplates`. Call `reedrichStore.fetchRecurringTemplates()` on mount. Add "+ Tambah Recurring" button that opens `recurring-form` drawer. Add click handler on each template row to open `recurring-detail` drawer. Verify: build succeeds and planning page renders live data.
- [x] 6.6 Add profile edit entry point: accessible from layout or user menu, opens `profile-form` drawer. Verify: build succeeds.

## 7. Vitest Unit Tests

- [x] 7.1 Create `apps/web/src/lib/stores/wallet-form.test.ts`: test openCreate defaults, openEdit populates from wallet, isValid rejects empty name, close resets. Verify: `bun run --cwd apps/web test` passes.
- [x] 7.2 Create `category-form.test.ts`, `budget-form.test.ts`, `goal-form.test.ts`, `recurring-form.test.ts` with same pattern per store. Verify: all tests pass.
- [x] 7.3 Create `apps/web/src/lib/stores/reedrich-crud.test.ts`: mock `fetch`, test each CRUD method (createWallet, updateWallet, deleteWallet, createCategory, updateCategory, deleteCategory, createBudget, updateBudget, deleteBudget, createGoal, updateGoal, deleteGoal, contributeToGoal, linkGoalWallet, unlinkGoalWallet, createRecurringTemplate, updateRecurringTemplate, deleteRecurringTemplate, applyRecurringTemplate, updateProfile). Test error handling (non-ok response throws with message). Verify: `bun run --cwd apps/web test` — all tests pass.

## 8. Playwright E2E Tests

- [x] 8.1 Create `tests/e2e/wallet-crud.spec.ts`: authenticate with test API key, create a wallet "E2E Test Wallet", verify it appears in accounts list, edit name to "E2E Updated", verify change, delete (after setting balance to 0), verify removal. Verify: `bunx playwright test tests/e2e/wallet-crud.spec.ts` passes.
- [x] 8.2 Create `tests/e2e/category-crud.spec.ts`: create category, verify, edit icon, verify, delete, verify removed. Verify: test passes.
- [x] 8.3 Create `tests/e2e/budget-crud.spec.ts`: create budget with date range, verify, edit amount, verify, delete, verify. Verify: test passes.
- [x] 8.4 Create `tests/e2e/goal-crud.spec.ts`: create goal, link wallet, contribute, edit target, delete, verify cleanup. Verify: test passes.
- [x] 8.5 Create `tests/e2e/recurring-crud.spec.ts`: create recurring template, verify in planning, edit amount, apply/realize, delete, verify removed. Verify: test passes.

## 9. Final Validation

- [x] 9.1 Run full validation suite: `bun run --cwd apps/web check` (svelte-check), `bun run --cwd apps/web test` (vitest), `bun run --cwd apps/web build` (production build). All must pass with 0 errors.
- [x] 9.2 Deploy to Cloudflare Pages (`bunx wrangler pages deploy build --project-name=maniyy2 --branch=main`) and verify CRUD operations work on live deployment against test account.
