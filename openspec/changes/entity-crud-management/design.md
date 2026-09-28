# Design

## Context

The app has full Transaction CRUD via `TransactionFormDrawer` and `transactionFormStore` — a dedicated store managing form state (mode, fields, validation) and a slide-over drawer component. All other entities (Wallets, Categories, Budgets, Goals, Recurring Templates) are read-only cards that open detail drawers via `reedrichStore.openDrawer()`. The Reedrich API now exposes complete CRUD endpoints for every entity. The planning page uses hardcoded mock recurring templates (lines 23-128 of `/planning/+page.svelte`).

See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Extend the existing drawer+store pattern to all 5 entity types + profile
- Reuse existing UI primitives: `ComboboxSingleSelect`, `SingleDatePicker`, `Skeleton`, `StatusBadge`
- Replace mock recurring templates with live API data
- Full test coverage: Vitest unit tests for store methods, Playwright E2E against the test account

**Non-Goals:**
- Debts & Loans CRUD (deferred)
- New page routes — all CRUD happens inside drawers on existing pages
- Offline mutation support

## Decisions

### 1. One Unified EntityFormStore Pattern

**Decision**: Create one `EntityFormStore` class per entity type (WalletFormStore, CategoryFormStore, BudgetFormStore, GoalFormStore, RecurringFormStore), each following the `TransactionFormStore` pattern.

**Rationale**: The transaction form store is proven and well-tested. Each entity has unique fields and validation rules, so separate stores avoid a generic god-store. The pattern is: `$state` fields, `$derived` isValid, `openCreate()`, `openEdit(entity)`, `close()`, `resetFields()`.

**Alternatives considered**: A single generic `EntityFormStore<T>` — rejected because entity-specific validation, field defaults, and form behavior differ enough to make generics complex without benefit.

### 2. Extend DrawerState Type Union, Not a New Drawer Component

**Decision**: Extend the existing `DrawerType` union in `@maniyy/shared` with new types (`wallet-form`, `category-form`, `budget-form`, `goal-form`, `recurring-form`, `recurring-detail`, `profile-form`) and add matching branches in `DrilldownDrawer.svelte`.

**Rationale**: The existing drawer container handles backdrop, ESC, slide animation, and header. Each entity form is a content component slotted into the same container. No need for a second drawer system.

**Type mapping**:
| DrawerType | Content Component | Mode |
|---|---|---|
| `wallet` | WalletDrawerContent (existing, read-only detail) | view |
| `wallet-form` | WalletFormContent (new) | create / edit |
| `category` | CategoryDrawerContent (existing) | view |
| `category-form` | CategoryFormContent (new) | create / edit |
| `budget` | BudgetDrawerContent (existing) | view |
| `budget-form` | BudgetFormContent (new) | create / edit |
| `goal` | GoalDrawerContent (existing) | view |
| `goal-form` | GoalFormContent (new) | create / edit |
| `recurring-detail` | RecurringDetailContent (new, read-only) | view |
| `recurring-form` | RecurringFormContent (new) | create / edit |
| `profile-form` | ProfileFormContent (new) | edit |

### 3. Detail Drawers Get Edit/Delete Action Buttons

**Decision**: Each existing detail drawer content (WalletDrawerContent, GoalDrawerContent, etc.) gains an action toolbar with "Edit" and "Hapus" buttons. "Edit" opens the form drawer. "Hapus" triggers inline confirmation then calls the DELETE endpoint.

**Delete confirmation UX**: Inline destructive confirmation bar (red background, "Yakin hapus? [Batal] [Hapus]") appears in-place at the bottom of the drawer, not a modal dialog. Consistent with minimalist-ui principles (no modal stacking).

### 4. Store CRUD Methods in ReedrichStore

**Decision**: Add CRUD methods directly to `ReedrichStore` following the existing `createTransaction` / `updateTransaction` / `deleteTransaction` pattern. Each method calls the API, handles errors, and calls `invalidateAndRefresh()` on success.

**New methods**:
```
// Wallets
createWallet(payload) → Wallet
updateWallet(id, delta) → Wallet
deleteWallet(id) → void

// Categories
createCategory(payload) → Category
updateCategory(id, delta) → Category
deleteCategory(id) → void

// Budgets
createBudget(payload) → Budget
updateBudget(id, delta) → Budget
deleteBudget(id) → void

// Goals
createGoal(payload) → Goal
updateGoal(id, delta) → Goal
deleteGoal(id) → void
contributeToGoal(id, payload) → Goal
linkGoalWallet(goalId, walletId) → void
unlinkGoalWallet(goalId, walletId) → void

// Recurring Templates
fetchRecurringTemplates() → void  (populates store state)
createRecurringTemplate(payload) → RecurringTemplate
updateRecurringTemplate(id, delta) → RecurringTemplate
deleteRecurringTemplate(id) → void
applyRecurringTemplate(id, payload?) → Transaction

// Profile
updateProfile(delta) → UserProfile
```

### 5. Recurring Templates: Live Data with Store State

**Decision**: Add `recurringTemplates = $state<RecurringTemplate[]>([])` and `isRecurringLoading = $state(false)` to `ReedrichStore`. The planning page calls `fetchRecurringTemplates()` on mount, replacing the hardcoded array.

### 6. Shared Type Additions in @maniyy/shared

**New interfaces** in `packages/shared/src/account-detail.ts`:
- `CreateWalletPayload`, `UpdateWalletPayload`
- `CreateCategoryPayload`, `UpdateCategoryPayload`
- `CreateBudgetPayload`, `UpdateBudgetPayload`
- `CreateGoalPayload`, `UpdateGoalPayload`, `ContributeGoalPayload`
- `CreateRecurringTemplatePayload`, `UpdateRecurringTemplatePayload`, `ApplyRecurringTemplatePayload`
- `RecurringTemplate` (full entity type — currently not typed)
- `UpdateProfilePayload`

Extend `DrawerType` to include the new form types.

## Component Hierarchy

```
DrilldownDrawer.svelte (existing container)
  +-- WalletDrawerContent.svelte (existing + add Edit/Delete toolbar)
  +-- WalletFormContent.svelte (NEW: create/edit form)
  +-- CategoryDrawerContent.svelte (existing + add Edit/Delete toolbar)
  +-- CategoryFormContent.svelte (NEW: create/edit form)
  +-- BudgetDrawerContent.svelte (existing + add Edit/Delete toolbar)
  +-- BudgetFormContent.svelte (NEW: create/edit form)
  +-- GoalDrawerContent.svelte (existing + add Edit/Delete/Contribute toolbar)
  +-- GoalFormContent.svelte (NEW: create/edit form)
  +-- RecurringDetailContent.svelte (NEW: detail view + Edit/Delete/Apply toolbar)
  +-- RecurringFormContent.svelte (NEW: create/edit form)
  +-- ProfileFormContent.svelte (NEW: edit profile form)
```

```
stores/
  +-- transaction-form.svelte.ts (existing, pattern to follow)
  +-- wallet-form.svelte.ts (NEW)
  +-- category-form.svelte.ts (NEW)
  +-- budget-form.svelte.ts (NEW)
  +-- goal-form.svelte.ts (NEW)
  +-- recurring-form.svelte.ts (NEW)
```

## Responsive Layout

- **Desktop (>= 1024px)**: Drawer slides in from right, max-width 620px (existing). Forms use single-column layout within drawer. Date pickers and comboboxes use existing responsive primitives.
- **Mobile (< 1024px)**: Drawer takes 100vw (existing behavior). Form inputs stack vertically. Action buttons use full-width layout.

## Data Contract Mapping

All CRUD operations use the Reedrich API directly (not through `/api/v1/account-detail`). After mutation, `invalidateAndRefresh()` re-fetches `account-detail` to reconcile derived state (net worth, allocations, goal snapshots).

Recurring templates are fetched independently via `GET /api/v1/recurring-templates` since they are not included in the `account-detail` response.

## Test Strategy

### Vitest Unit Tests

Per-store test files following existing `reedrich.test.ts` pattern (mock `fetch`):

| Store File | Test File | Cases |
|---|---|---|
| `reedrich.svelte.ts` (extended) | `reedrich-crud.test.ts` | createWallet, updateWallet, deleteWallet (+ error cases), same for Category, Budget, Goal (incl. contribute, link/unlink), Recurring (incl. apply), updateProfile |
| `wallet-form.svelte.ts` | `wallet-form.test.ts` | openCreate defaults, openEdit populates, validation rules, close resets |
| `category-form.svelte.ts` | `category-form.test.ts` | Same pattern |
| `budget-form.svelte.ts` | `budget-form.test.ts` | Date validation, amount > 0 |
| `goal-form.svelte.ts` | `goal-form.test.ts` | walletIds multi-select, targetDate in future |
| `recurring-form.svelte.ts` | `recurring-form.test.ts` | Frequency/interval defaults, date range validation |

### Playwright E2E Tests

Test account: `testbot@maniyy.dev` (API key `rd_live_6133a5ec3ca3c2fc1d224f677cc31c13`)

| Test File | Flow |
|---|---|
| `wallet-crud.spec.ts` | Create wallet → verify in list → edit name → verify → delete → verify removed |
| `category-crud.spec.ts` | Create category → verify → edit icon → verify → delete → verify |
| `budget-crud.spec.ts` | Create budget → verify → edit amount → verify → delete → verify |
| `goal-crud.spec.ts` | Create goal → link wallet → contribute → edit target → delete → verify cleanup |
| `recurring-crud.spec.ts` | Create template → verify in planning → edit → apply/realize → delete → verify |

Each test creates its own entities, verifies UI state, and deletes them in cleanup (afterEach or test tail).

## Risks / Trade-offs

- **Test data isolation**: E2E tests hit the real API with the test account. Tests must clean up created entities to avoid data accumulation. Risk: flaky tests if cleanup fails. Mitigation: each test creates uniquely-named entities and deletes in `afterEach`.
- **Drawer complexity**: GoalFormContent is the most complex (multi-wallet linking, contribute, currency). Risk: drawer height overflow on mobile. Mitigation: scrollable form body within the existing drawer overflow-y-auto container.
- **API error variety**: Different entities have different delete constraints (wallet needs balance=0, category protects system entries). The drawer must surface entity-specific error messages from the API rather than generic failures.
