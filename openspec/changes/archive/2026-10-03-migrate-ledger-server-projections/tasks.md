# Tasks
## 1. Ledger Horizon Board Server Integration

- [x] 1.1 Add `fetchHorizonProjections()` call and `horizonData` reactive state to `apps/web/src/lib/components/ledger/HorizonBoard.svelte` with `AbortController` and loading states, matching the Accounts/Goals pattern.
- [x] 1.2 Update `periodSummaries` calculation in `HorizonBoard.svelte` to read `closingNetWorth`, `spendable`, and `locked` from `srvPeriod.netWorth`, and derive `walletBalancesAtHorizon` from `srvPeriod.walletBalances`.
- [x] 1.3 Fix the skeleton loading condition in `HorizonBoard.svelte` to use `isHorizonLoading && !horizonData` instead of `isLedgerLoading && allTransactions.length === 0`.
- [x] 1.4 Remove `allTxs` derivation and imports of `calculatePointInTimeNetWorth` and `calculatePointInTimeWalletBalances` from `HorizonBoard.svelte`.

## 2. Ledger List View Server-Driven Projections

- [x] 2.1 Add server-driven horizon fetching for future/past date filter ranges in `apps/web/src/routes/ledger/+page.svelte`, querying single-period horizon data when `dateFilterStore.endDate` falls outside the current calendar month.
- [x] 2.2 Update `pointInTimeNetWorth` derivation in `routes/ledger/+page.svelte` to consume the fetched horizon result for future/past ranges and `snapshot.netWorth` for present month, removing the client-side `calculatePointInTimeNetWorth(allTxs)` path.
- [x] 2.3 Remove `allTxs` derivation and `calculatePointInTimeNetWorth` import from `routes/ledger/+page.svelte`.

## 3. Zombie State Removal and Fallback Hardening

- [x] 3.1 Remove `allTransactions` and `isLedgerLoading` state fields and their reset assignments from `apps/web/src/lib/stores/reedrich.svelte.ts`.
- [x] 3.2 Remove unused `allTxs` derivation from `apps/web/src/routes/accounts/+page.svelte`.
- [x] 3.3 Update fallback branches in `AccountsHorizonBoard.svelte` and `GoalsHorizonBoard.svelte` to fallback to current snapshot values with an explicit console warning instead of calling calculations with empty arrays.
- [x] 3.4 Run `bun run check` (svelte-check) to verify no broken imports or type references to `allTransactions` or `isLedgerLoading` remain across the codebase.

## 4. Value Integrity E2E Test Coverage

- [x] 4.1 Update `apps/web/tests/multi-horizon-board.spec.ts` to assert that consecutive period columns on the Ledger Horizon Board display numerically distinct Net Worth values when future cashflow exists.
- [x] 4.2 Add assertion in `multi-horizon-board.spec.ts` comparing the displayed Net Worth value in a future period against the `/api/v1/analytics/horizon` response to prove agreement with the server calculation.
- [x] 4.3 Update `apps/web/tests/ledger-dual-layer.spec.ts` to verify that switching the date filter from "Bulan Ini" to "Bulan Depan" changes the numeric value of the right-zone Net Worth anchor when planned transactions exist.
- [x] 4.4 Run unit tests (`bun test`) and targeted Playwright tests (`bunx playwright test tests/multi-horizon-board.spec.ts tests/ledger-dual-layer.spec.ts`) to verify all assertions pass.
