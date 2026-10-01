# Tasks

## 1. Store Layer Standalone Entity Fetchers

- [x] 1.1 Add `fetchWallets(): Promise<WalletItem[]>` to `apps/web/src/lib/stores/reedrich.svelte.ts` querying `GET /api/v1/wallets` and populating `activeWallets`.
- [x] 1.2 Add `fetchDebtsLoans(): Promise<{ activeDebts: DebtLoan[]; activeLoans: DebtLoan[] }>` to `apps/web/src/lib/stores/reedrich.svelte.ts` querying `GET /api/v1/debts-loans`.
- [x] 1.3 Add unit tests in `apps/web/src/lib/stores/reedrich.test.ts` for `fetchWallets` and `fetchDebtsLoans`.

## 2. Bank & Accounts Studio Decoupling & Horizon UX

- [x] 2.1 Update `apps/web/src/routes/accounts/+page.svelte` to invoke `reedrichStore.fetchWallets()` on mount with dedicated skeleton loading indicator.
- [x] 2.2 Update `apps/web/src/lib/stores/wallet-form.svelte.ts` to call `reedrichStore.fetchWallets()` after create, update, and delete mutations.
- [x] 2.3 Conditionally hide `DateRangePicker` in `apps/web/src/routes/accounts/+page.svelte` when `viewMode === 'horizon'`.
- [x] 2.4 Update `apps/web/src/lib/components/accounts/AccountsHorizonBoard.svelte` to calculate column subtotals from filtered wallets when active search or status filters exist.

## 3. Planning Studio Entity Decoupling & Toolbar Context

- [x] 3.1 Update `apps/web/src/routes/planning/+page.svelte` to trigger `fetchBudgets()`, `fetchGoals()`, and `fetchDebtsLoans()` when corresponding sub-tabs become active.
- [x] 3.2 Conditionally hide `DateRangePicker` in `apps/web/src/routes/planning/+page.svelte` when `activeSubTab === 'goals'` and `goalsViewMode === 'horizon'`.

## 4. Ledger Studio Toolbar Context

- [x] 4.1 Conditionally hide `DateRangePicker` in `apps/web/src/routes/ledger/+page.svelte` when `settingsStore.settings.ledgerViewMode === 'calendar_board'`.

## 5. Testing & Validation

- [x] 5.1 Run unit test suite: `bun run --cwd apps/web test:unit`.
- [x] 5.2 Run typecheck and lint: `bun run check:web` and `bun run lint:web`.
- [x] 5.3 Create and run Playwright E2E test `apps/web/tests/decoupled-entities-and-horizon-ux.spec.ts` verifying `/api/v1/wallets` request on `/accounts`, `lastTransaction` details, and conditional `DateRangePicker` hiding in horizon views.
