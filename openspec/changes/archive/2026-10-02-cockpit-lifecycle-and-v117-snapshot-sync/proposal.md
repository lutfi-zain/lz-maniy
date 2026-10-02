# Proposal

## Why

In Reedrich v1.17.0, `GET /api/v1/account-detail` introduced server-side temporal filtering: when queried without date bounds or for the current month, expired budgets whose start/end periods have elapsed (such as completed budgets from previous months) are filtered out from the response payload.

However, in Maniyy V2, expired budgets and goals still linger on the Cockpit dashboard due to two client-side architectural issues:
1. `fetchSnapshot()` is initially invoked without date bounds and is not reactively re-synchronized when the user adjusts `dateFilterStore`.
2. When navigating to `/planning`, `fetchBudgets()` retrieves all historical budgets from `GET /api/v1/budgets` and overwrites `this.snapshot.budgets`, corrupting the server-filtered snapshot when returning to the Cockpit.
3. Cockpit widgets (`CockpitAllocationWidget` and `CockpitAlertBanner`) render raw store arrays without validating period activity (`resolveBudgetPeriod`) or goal completion status (`resolveGoalLifecycle`).

Synchronizing `fetchSnapshot()` with date filter bounds and enforcing lifecycle checks ensures that the Cockpit only surfaces active, actionable budgets and goals for the selected timeframe.

## What Changes

- **Reactive Snapshot Date Synchronization**:
  - Wire `fetchSnapshot({ startDate, endDate })` to reactively synchronize with `dateFilterStore` on the Cockpit (`/`) route, ensuring backend v1.17.0 temporal filtering is respected.
- **Store-Level Isolation of Standalone Budgets**:
  - In `reedrichStore.fetchBudgets()`, preserve `this.snapshot.budgets` rather than overwriting it with the unfiltered historical collection from `GET /api/v1/budgets`.
  - Maintain a dedicated `allBudgets` state for views requiring the full historical list (such as `/planning`).
- **Cockpit Widget Lifecycle Filtering**:
  - In `CockpitAllocationWidget.svelte`, filter displayed budgets using `resolveBudgetPeriod(b).isActive` so only active periods appear in the Cockpit summary.
  - In `CockpitAlertBanner.svelte`, check goal lifecycle (`daysRemaining > 0`, `status !== 'completed'`, `!goal.isReached`) before displaying pacing deficit warnings.

## Capabilities

### Modified Capabilities
- `account-dashboard`: Enforce lifecycle filtering on Cockpit widgets so completed or past budgets and fulfilled goals do not linger on the operational workbench.
- `financial-store`: Prevent standalone historical budget queries from polluting the temporally-filtered `snapshot.budgets` array.

## Impact

- **Frontend (`apps/web`)**:
  - `src/routes/+page.svelte`: Reactive effect calling `reedrichStore.fetchSnapshot({ startDate, endDate })` when `dateFilterStore` changes.
  - `src/lib/stores/reedrich.svelte.ts`: Isolate standalone budget fetch from `snapshot.budgets`.
  - `src/lib/components/cockpit/CockpitAllocationWidget.svelte`: Filter budgets by active period.
  - `src/lib/components/cockpit/CockpitAlertBanner.svelte`: Filter pacing alerts by active goal lifecycle.
