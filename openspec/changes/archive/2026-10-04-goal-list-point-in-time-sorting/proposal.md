## Why

The Planning Studio Goals list view (`/planning`) does not synchronize with `dateFilterStore`, showing only static live wallet balances regardless of the selected date range. Furthermore, maximizing a period column from the Goals Horizon Board switches to the List view with custom date bounds, but the List view fails to compute point-in-time accumulated balances and lacks sorting, displaying goals in arbitrary database order instead of ranking them by accumulated value.

## What Changes

- **Point-in-Time Goal Balance Synchronization**: When `activeSubTab === 'goals'` in `/planning`, bind `dateFilterStore` changes to reactive wallet balance queries (`reedrichStore.fetchWallets({ startDate, endDate })`), dynamically calculating point-in-time accumulated amounts (`liveCurrent`) for both derived goals (sum of linked wallet balances in IDR at period end) and standalone goals.
- **Reference Date Lifecycle Resolution**: Pass `referenceDate = dateFilterStore.endDate` (or fallback to today) into `resolveGoalLifecycle()`, ensuring overdue calculations and days-remaining countdowns accurately reflect the selected date window.
- **Sort by Highest Current Amount**: Sort the displayed goal list descending by accumulated current amount (`liveCurrent`), ensuring high-value milestones appear prominently at the top.
- **Filter Persistence & Controls**: Add `goalSortBy: 'current_amount_desc' | 'target_amount_desc' | 'name'` to `planningFilterStore`, persisting sorting state in-memory across SPA navigation with default `'current_amount_desc'`.
- **Seamless Horizon-to-List Transition**: Ensure clicking "Maksimalkan periode ke tampilan List" on any Goals Horizon Board column renders the List view with identical point-in-time balances and sorting corresponding to that period.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `planning-studio`: Update Goal lifecycle and list requirements to specify point-in-time balance accumulation against `dateFilterStore` and sorting by highest current amount.

## Impact

- **Affected Surfaces**:
  - `apps/web/src/routes/planning/+page.svelte` (reactive date filter effect, point-in-time `liveCurrent` resolution, sorting logic, sort selector UI).
  - `apps/web/src/lib/stores/planning-filter.svelte.ts` (`goalSortBy` filter attribute and getter/setter).
- **Backend API**: No changes required. Reuses existing `GET /api/v1/wallets?startDate=...&endDate=...` edge endpoint and `fetchWallets()` concurrency pool.
- **Breaking Changes**: None. Backward compatible with existing default views.
