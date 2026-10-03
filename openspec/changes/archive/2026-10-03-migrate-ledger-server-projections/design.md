# Design

## Context

See proposal.md — Why. Three Horizon Board components exist with two data architectures:

| Component | Data Source | Status |
| :--- | :--- | :--- |
| `AccountsHorizonBoard.svelte` | `fetchHorizonProjections()` → `srvPeriod` | ✅ Server-driven |
| `GoalsHorizonBoard.svelte` | `fetchHorizonProjections()` → `srvPeriod` | ✅ Server-driven |
| `HorizonBoard.svelte` (ledger) | `calculatePointInTimeNetWorth(allTxs=[])` | ❌ Broken client-side |

The List View's right-zone anchor (`routes/ledger/+page.svelte:291`) uses the same broken client-side path.

Backend endpoint `GET /api/v1/analytics/horizon?periods=...&baseCurrency=IDR` returns a `HorizonBoardDTO` with precomputed per-period `netWorth.{total, spendable, locked}`, `cashflow.{income, expense, net}`, `walletBalances[]`, and `goals[]`.

## Goals / Non-Goals

**Goals:**
- Eliminate the Rp 82M+ projection error on `/ledger` by aligning both views to server-computed projections.
- Remove zombie state (`allTransactions`, `isLedgerLoading`) that can no longer be populated.
- Prevent silent fallback degradation in Accounts/Goals Horizon Boards.
- Add E2E assertions proving numeric integrity.

**Non-Goals:**
- Redesigning the Horizon Board visual layout.
- Changing the backend projection algorithm.
- Adding offline projection capability (out of scope; server is source of truth).

## Decisions

### D1: Ledger Horizon Board — Adopt the Accounts/Goals pattern

**Decision**: Add `fetchHorizonProjections(orderedPeriods)` call with `$effect` + `AbortController` to `HorizonBoard.svelte`, identical to `AccountsHorizonBoard.svelte:41-65`.

**Rationale**: Proven pattern already in production on two sibling boards. Minimizes new code and risk.

**Changes to `HorizonBoard.svelte`**:
1. Add `horizonData = $state<HorizonBoardDTO | null>(null)` and `isHorizonLoading = $state(true)`.
2. Add `$effect` calling `reedrichStore.fetchHorizonProjections(orderedPeriods)`.
3. In `periodSummaries` computation:
   - Lookup `srvPeriod = horizonData?.periods.find(p => p.periodKey === periodKey)`.
   - Use `srvPeriod.netWorth.{total, spendable, locked}` for `closingNetWorth`, `spendable`, `locked`.
   - Use `srvPeriod.cashflow.{income, expense, net}` for cashflow (replacing the `allTxs` loop).
   - Derive `walletBalancesAtHorizon` from `srvPeriod.walletBalances` (for goal snapshots).
   - Fallback to current snapshot values only if `srvPeriod` is null (API still loading).
4. Replace skeleton condition from `isLedgerLoading && allTransactions.length === 0` to `isHorizonLoading && !horizonData`.
5. Remove imports of `calculatePointInTimeNetWorth` and `calculatePointInTimeWalletBalances`.
6. Remove `allTxs` derivation.
7. Set `label` from `srvPeriod`: present month → `'NET WORTH SAAT INI'`, future → `'PROYEKSI NET WORTH'`, past → `'NET WORTH PENUTUPAN'`. Derive horizon type from comparing `periodKey` with current `YYYY-MM`.

### D2: Ledger List View — Use horizon endpoint for future/past anchors

**Decision**: For non-present horizons, call `fetchHorizonProjections([endDatePeriod])` to get one period's precomputed net worth. For present month, use `reedrichStore.snapshot` directly (no change needed).

**Changes to `routes/ledger/+page.svelte`**:
1. Add `$effect` that watches `dateFilterStore.endDate`. If endDate falls in a future or past month (vs current), call `reedrichStore.fetchHorizonProjections([endYearMonth])` and store the result.
2. Replace `calculatePointInTimeNetWorth(allTxs)` derivation with:
   - Present: `{ label: 'NET WORTH SAAT INI', amount: snapshot.netWorth.total, spendable: snapshot.wallets.spendable.total, locked: snapshot.wallets.locked.total }`.
   - Future/Past: values from the single-period horizon response.
3. Remove `allTxs` derivation and `calculatePointInTimeNetWorth` import.

### D3: Fallback resilience in Accounts/Goals Horizon Boards

**Decision**: In the `else` branch (where `srvPeriod` is null), check if `allTxs.length === 0` and if so, use current snapshot values instead of running `calculatePointInTimeWalletBalances` with empty data. Log a warning.

**Rationale**: Prevents silent degradation. The fallback should not produce an incorrect result that looks correct.

### D4: Zombie state removal from `reedrichStore`

**Decision**: Remove `allTransactions`, `isLedgerLoading`, and all references.

**Files affected**:
- `apps/web/src/lib/stores/reedrich.svelte.ts`: Remove fields, remove assignments in `invalidateAndRefresh()` and `logout()`.
- `apps/web/src/routes/ledger/+page.svelte`: Remove `allTxs` derivation.
- `apps/web/src/routes/accounts/+page.svelte`: Remove unused `allTxs` derivation.
- `apps/web/src/lib/components/ledger/HorizonBoard.svelte`: Remove `allTxs` derivation.
- `apps/web/src/lib/components/accounts/AccountsHorizonBoard.svelte`: Remove `allTxs` derivation (fallback uses snapshot values per D3).
- `apps/web/src/lib/components/goals/GoalsHorizonBoard.svelte`: Remove `allTxs` derivation (fallback uses snapshot values per D3).

**NOT removed**: `calculatePointInTimeNetWorth` and `calculatePointInTimeWalletBalances` in `networth-timeline.ts` — they remain valid for unit tests and the `finance-oracle.ts` offline fixture.

### D5: Responsive behavior

No layout changes. Mobile (`<1024px`) always renders List view and never sees the Horizon Board. The List View right-zone anchor works identically on desktop and mobile.

## Test Strategy

### Unit Tests (Vitest)
- `reedrich.test.ts`: Verify `allTransactions` and `isLedgerLoading` no longer exist on the store interface.
- Existing `networth-timeline.test.ts`: No changes needed (functions remain valid utilities).

### E2E Tests (Playwright)
- **`multi-horizon-board.spec.ts`**: Add assertion that Net Worth values differ across consecutive Ledger Horizon Board periods when cashflow is nonzero. Intercept `/api/v1/analytics/horizon` response and compare the displayed value against the API response.
- **`financial-lifecycle.spec.ts` Test 16**: Extend to assert that the Ledger Horizon Board's Net Worth values match the API horizon response (currently only checks transaction count visibility).

## Risks / Trade-offs

| Risk | Mitigation |
| :--- | :--- |
| List View anchor now requires an API call for future/past filters (was previously computed client-side from cache) | Single-period horizon call is lightweight (~50ms); present month still uses cached snapshot with zero latency |
| Removing `allTransactions` could break unknown consumers | Exhaustive grep confirms only 5 consumer files, all addressed in D4. `svelte-check` will catch any missed TypeScript references |
| Horizon API failure leaves summary card without NW data | D1 specifies visible degradation indicator rather than silent fallback to wrong values |
