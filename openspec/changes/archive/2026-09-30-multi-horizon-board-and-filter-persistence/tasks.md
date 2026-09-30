# Tasks

## 1. In-Memory Filter Stores

- [x] 1.1 Create `apps/web/src/lib/stores/ledger-filter.svelte.ts` managing `selectedWalletIds`, `selectedCategoryIds`, `selectedBudgetIds`, `selectedType`, `selectedStatus`, `searchKeyword`, and pagination state with unit tests in `apps/web/src/lib/stores/ledger-filter.test.ts`.
- [x] 1.2 Create `apps/web/src/lib/stores/accounts-filter.svelte.ts` managing `searchQuery`, `statusFilter`, `sortBy`, and `viewMode` (`'list' | 'horizon'`) with unit tests in `apps/web/src/lib/stores/accounts-filter.test.ts`.
- [x] 1.3 Create `apps/web/src/lib/stores/planning-filter.svelte.ts` managing `activeSubTab`, `goalFilter`, `budgetFilter`, and `goalsViewMode` (`'list' | 'horizon'`) with unit tests in `apps/web/src/lib/stores/planning-filter.test.ts`.

## 2. Ledger Studio Polish & Maximize Action

- [x] 2.1 Update `apps/web/src/lib/components/ledger/ViewModeSwitcher.svelte` to change label from "Daftar" to "List".
- [x] 2.2 Update `apps/web/src/lib/components/ledger/PeriodSummaryCard.svelte` to remove Layer 3 (Goal Pacing / Snapshot Goals) while preserving cashflow and net worth metrics.
- [x] 2.3 Add Maximize button with icon to `apps/web/src/lib/components/ledger/HorizonPeriodColumn.svelte` next to the Plus button that sets `dateFilterStore` to the month bounds and switches view mode to `List`.
- [x] 2.4 Refactor `apps/web/src/routes/ledger/+page.svelte` to bind all filter controls to `ledgerFilterStore` instead of local `$state`.

## 3. Bank & Accounts Horizon Board

- [x] 3.1 Create `apps/web/src/lib/components/accounts/AccountsHorizonBoard.svelte` rendering chronological monthly period columns with point-in-time wallet balances from `calculatePointInTimeWalletBalances` and liquidity totals (spendable, locked, net worth).
- [x] 3.2 Add view mode switcher toggle (`List` vs `Horizon Board`) to `apps/web/src/routes/accounts/+page.svelte` and bind filters to `accountsFilterStore`.

## 4. Planning Studio Goals Horizon Board

- [x] 4.1 Create `apps/web/src/lib/components/goals/GoalsHorizonBoard.svelte` rendering chronological monthly period columns with goal cards, progress percentages, milestone badges (`Tercapai!`), and monthly pacing calculations.
- [x] 4.2 Add view mode switcher toggle (`List` vs `Horizon Board`) to the Goals sub-tab in `apps/web/src/routes/planning/+page.svelte` and bind filters to `planningFilterStore`.

## 5. Testing & Validation

- [x] 5.1 Run unit test suite: `bun run --cwd apps/web test:unit`.
- [x] 5.2 Run typecheck and lint: `bun run check:web` and `bun run lint:web`.
- [x] 5.3 Create and run Playwright E2E test `apps/web/tests/multi-horizon-board.spec.ts` verifying view toggles, filter persistence across page navigation, and column maximize actions.
