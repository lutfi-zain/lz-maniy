# Proposal: Decouple Entity Data Fetching and Contextual Horizon UX

## Why

While transactions, categories, and recurring templates have been cleanly decoupled to dedicated REST endpoints, `/accounts` and `/planning` still passively consume their primary entities from the monolithic `GET /api/v1/account-detail` snapshot. Specifically:
1. `/accounts` relies on `snapshot.wallets` instead of calling `GET /api/v1/wallets`, resulting in missing or stale `lastTransaction` objects on wallet cards and inaccurate `last_tx` sorting.
2. `/planning` sub-tabs (Budgets, Goals, Obligations) passively read from `snapshot` instead of calling their standalone endpoints (`GET /api/v1/budgets`, `GET /api/v1/goals`, `GET /api/v1/debts-loans`).
3. Across `/ledger`, `/accounts`, and `/planning` (Goals), the global `DateRangePicker` remains visible in Horizon Board mode even though multi-month columns are self-contained with independent monthly windows, confusing users into thinking date selection is broken.

Decoupling entity fetching to their dedicated endpoints and making the top toolbar context-aware establishes an independent, high-performance, and cohesive architecture.

## What Changes

- **Standalone Wallet Fetching (`GET /api/v1/wallets`)**:
  - Implement `reedrichStore.fetchWallets()` to query `GET /api/v1/wallets` through `concurrencyPool` and populate `activeWallets`.
  - Update `allWallets` to derive from `activeWallets` (with fallback to snapshot).
  - Update `apps/web/src/routes/accounts/+page.svelte` to invoke `reedrichStore.fetchWallets()` on mount and after wallet mutations.
  - Surface real `lastTransaction` data from `GET /api/v1/wallets` in wallet cards and ensure `sortBy = 'last_tx'` sorts accurately.
- **Standalone Planning Entity Fetching**:
  - Implement `reedrichStore.fetchDebtsLoans()` to query `GET /api/v1/debts-loans`.
  - Update `apps/web/src/routes/planning/+page.svelte` to trigger standalone fetchers (`fetchBudgets()`, `fetchGoals()`, `fetchDebtsLoans()`) on mount and when active sub-tabs change.
- **Context-Aware Horizon Toolbar UX**:
  - Hide `DateRangePicker` across `/ledger`, `/accounts`, and `/planning` (Goals) when view mode is Horizon Board (`viewMode === 'horizon'` or `ledgerViewMode === 'calendar_board'`).
  - In `AccountsHorizonBoard.svelte`, ensure column subtotal summaries reactively calculate from filtered wallets when search query or status filter is active.

## Capabilities

### New Capabilities
None. All changes enhance existing financial store pipelines, accounts matrix, planning studio, and ledger presentation surfaces.

### Modified Capabilities
- `financial-store`: Update requirements to specify standalone list fetching for wallets (`fetchWallets`) and debts/loans (`fetchDebtsLoans`).
- `account-matrix`: Update requirements to specify standalone wallet retrieval on mount, real-time `lastTransaction` card presentation, and conditional hiding of `DateRangePicker` in Horizon Board mode.
- `planning-studio`: Update requirements to specify sub-tab-triggered standalone entity fetching and conditional hiding of `DateRangePicker` in Goals Horizon Board mode.
- `ledger-studio`: Update requirements to specify conditional hiding of `DateRangePicker` in Horizon Board mode.

## Impact

- **Codebase**:
  - `apps/web/src/lib/stores/reedrich.svelte.ts` (add `fetchWallets`, `fetchDebtsLoans`, derive `allWallets` from `activeWallets`)
  - `apps/web/src/routes/accounts/+page.svelte` (call `fetchWallets`, hide `DateRangePicker` in horizon view)
  - `apps/web/src/routes/planning/+page.svelte` (trigger sub-tab fetchers, hide `DateRangePicker` in goals horizon view)
  - `apps/web/src/routes/ledger/+page.svelte` (hide `DateRangePicker` in horizon view)
  - `apps/web/src/lib/components/accounts/AccountsHorizonBoard.svelte` (reactive filtered subtotal calculation)
- **Breaking Changes**: None. Backwards compatible with existing store subscriptions.
