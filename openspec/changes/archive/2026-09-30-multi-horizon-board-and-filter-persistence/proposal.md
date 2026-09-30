# Proposal: Multi-Horizon Board and In-Memory Filter Persistence

## Why

The current multi-period Horizon Board is exclusively implemented in the transaction Ledger (`/ledger`). In that view, each monthly column combines transaction line items, cashflow metrics, point-in-time net worth, and savings goal progress ("Goal Pacing") in a single congested layout. Savings goal pacing is structurally misaligned with daily transaction tracking and directly belongs in Planning (`/planning`), while balance projections across bank and digital wallets across future horizons naturally belong in Bank & Accounts (`/accounts`).

Furthermore, active filter selections on `/ledger`, `/accounts`, and `/planning` are currently stored as local component `$state`. When users navigate across pages in the SPA, components unmount and discard their state, resetting user-selected filters upon return. Elevating filter state into independent in-memory Svelte 5 rune stores ensures filter choices remain preserved across navigation without persisting indefinitely across browser refreshes.

## What Changes

- **Ledger Horizon Board De-Cluttering (`/ledger`)**:
  - Remove Layer 3 (Savings Goals Snapshot / Goal Pacing) from `PeriodSummaryCard.svelte`.
  - Rename the view mode toggle label in `ViewModeSwitcher.svelte` from **"Daftar"** to **"List"**.
  - Add a **Maximize** button (with icon such as `ArrowsOut` / `CornersOut`) adjacent to the Quick-Add (`+`) button in each `HorizonPeriodColumn.svelte` header.
  - Clicking Maximize updates the active date range (`dateFilterStore`) to that period's exact monthly bounds (`startDate` to `endDate`) and switches the view mode to `List` (`'single'`), immediately presenting a focused tabular view for that period.
- **Bank & Accounts Horizon Board (`/accounts`)**:
  - Add a view mode switcher (`List` vs `Horizon Board`) to the `/accounts` header.
  - In `Horizon Board` view, render chronological monthly period columns displaying:
    - Point-in-time projected balance for each wallet at that period's horizon (derived via `calculatePointInTimeWalletBalances`).
    - Point-in-time liquidity summary: Spendable vs Locked totals and closing Net Worth.
- **Savings Horizon Board (`/planning` -> Goals / Tabungan)**:
  - Add a view mode switcher (`List` vs `Horizon Board`) specifically scoped to the Goals sub-tab in `/planning`.
  - In `Horizon Board` view, render chronological monthly period columns displaying:
    - Savings goal progress cards: projected balance at horizon, progress percentage, milestone badge (`Tercapai!`), and required monthly pacing.
- **Independent In-Memory Filter Persistence**:
  - Introduce `ledgerFilterStore.svelte.ts` to persist wallet IDs, category IDs, budget IDs, transaction type, transaction status, search query, and pagination in memory across page navigation.
  - Introduce `accountsFilterStore.svelte.ts` to persist status filter (all/spendable/locked), sort option, search query, and view mode (grouped/flat/horizon).
  - Introduce `planningFilterStore.svelte.ts` to persist active sub-tab (goals/budgets/obligations/categories), goal filter status, and budget filter period.
  - All three stores operate independently in memory (resetting only on hard page reload / F5), while `dateFilterStore` remains global and shared across views.

## Capabilities

### New Capabilities
None. All additions enhance existing studio, filtering, and matrix surfaces.

### Modified Capabilities
- `ledger-studio`: Update requirements to reflect the rename of "Daftar" to "List", removal of goal pacing from the summary card, addition of the column maximize button to switch to filtered List view, and filter persistence across navigation.
- `account-matrix`: Add requirements for the multi-period Horizon Board view displaying point-in-time wallet balance projections and filter persistence.
- `planning-studio`: Add requirements for the Savings Horizon Board view displaying goal progress and pacing projections per monthly column, and sub-tab filter persistence.
- `date-filter`: Update requirements to specify support for period column maximize triggering, synchronizing global date bounds from Horizon Board period cards.

## Impact

- **Codebase**:
  - `apps/web/src/lib/components/ledger/ViewModeSwitcher.svelte` (label rename)
  - `apps/web/src/lib/components/ledger/PeriodSummaryCard.svelte` (remove goal pacing layer)
  - `apps/web/src/lib/components/ledger/HorizonPeriodColumn.svelte` (maximize button & action)
  - `apps/web/src/lib/components/accounts/AccountsHorizonBoard.svelte` (new component for /accounts)
  - `apps/web/src/lib/components/goals/GoalsHorizonBoard.svelte` (new component for /planning goals)
  - `apps/web/src/lib/stores/ledger-filter.svelte.ts` (new in-memory filter store)
  - `apps/web/src/lib/stores/accounts-filter.svelte.ts` (new in-memory filter store)
  - `apps/web/src/lib/stores/planning-filter.svelte.ts` (new in-memory filter store)
  - `apps/web/src/routes/ledger/+page.svelte` (integrate filter store & maximize)
  - `apps/web/src/routes/accounts/+page.svelte` (integrate view switcher & filter store)
  - `apps/web/src/routes/planning/+page.svelte` (integrate view switcher & filter store)
- **Breaking Changes**: None. Backwards compatible with existing Reedrich API snapshots and transaction caches.
