## Context

See `proposal.md` for motivation. Currently, `apps/web/src/routes/planning/+page.svelte` only invokes `reedrichStore.fetchGoals()` on initial mount and tab switch, but never synchronizes wallet balances with `dateFilterStore`. Derived goals determine accumulated progress by summing static `lw.convertedAmount` or fallback to `g.currentAmount`. When users select custom dates or maximize a horizon period column, the List view fails to display point-in-time balances and lacks any sort order.

## Goals / Non-Goals

**Goals:**
- Implement reactive temporal synchronization for `/planning` Goals sub-tab that re-queries `fetchWallets({ startDate, endDate })` via the existing concurrency pool whenever `dateFilterStore` updates.
- Dynamically resolve `liveCurrent` for each goal by looking up point-in-time balances from `reedrichStore.allWallets` across its linked wallets, converting foreign currencies into IDR via `getConvertedBalanceInIDR`.
- Pass `dateFilterStore.endDate` (or fallback `new Date()`) as `referenceDate` into `resolveGoalLifecycle(g, referenceDate)`.
- Sort displayed goals by default in descending order of accumulated `liveCurrent` (`b.liveCurrent - a.liveCurrent`).
- Introduce `goalSortBy` (`'current_amount_desc' | 'target_amount_desc' | 'name'`) into `planningFilterStore` and render a minimalist select dropdown in the Goals toolbar alongside status tabs.

**Non-Goals:**
- Modifying backend `/api/v1/goals` endpoints or schema (wallet point-in-time calculations are natively resolved client-side from `/api/v1/wallets`).
- Changing Budgets or Obligations date handling (handled in separate existing scopes).

## Decisions

### 1. Reactive Point-in-Time Wallet Balance Fetching in `/planning`
Add an `$effect` in `apps/web/src/routes/planning/+page.svelte` scoped to `activeSubTab === 'goals'`:
```ts
$effect(() => {
    if (activeSubTab !== 'goals') return;
    const start = dateFilterStore.startDate;
    const end = dateFilterStore.endDate;
    const controller = new AbortController();
    
    reedrichStore.fetchWallets(
        {
            startDate: start || undefined,
            endDate: end || undefined
        },
        controller.signal
    ).catch((err) => {
        if (!controller.signal.aborted) {
            console.warn('Failed to sync point-in-time wallets for goals:', err);
        }
    });

    return () => {
        controller.abort();
    };
});
```
*Rationale*: Matches the battle-tested pattern in `apps/web/src/routes/accounts/+page.svelte:74-95`, ensuring signal abort safety and concurrency pool compliance.

### 2. Fast O(1) Linked Wallet Balance Resolution
Create a reactive lookup map `walletBalanceMap` in `planning/+page.svelte`:
```ts
const walletBalanceMap = $derived.by(() => {
    const map = new Map<string, number>();
    for (const w of reedrichStore.allWallets) {
        map.set(w.walletId, w.balance);
    }
    return map;
});
```
For each goal, compute `liveCurrent`:
```ts
function computeGoalCurrentAmount(g: GoalSnapshot, balances: Map<string, number>): number {
    if (g.linkedWalletsBreakdown && g.linkedWalletsBreakdown.length > 0) {
        let total = 0;
        for (const lw of g.linkedWalletsBreakdown) {
            const raw = balances.get(lw.walletId) ?? lw.balance;
            total += getConvertedBalanceInIDR(raw, lw.currency);
        }
        return total;
    }
    return g.currentAmount;
}
```
*Rationale*: Matches the identical formula used in `GoalsHorizonBoard.svelte:93-101`, ensuring 100% numerical parity between Horizon Board columns and the maximized List view.

### 3. Temporal Lifecycle Resolution
Pass `referenceDate` to `resolveGoalLifecycle`:
```ts
const referenceDate = $derived(
    dateFilterStore.endDate ? new Date(dateFilterStore.endDate + 'T23:59:59') : new Date()
);
const goalsWithLifecycle = $derived(
    goals.map((g) => {
        const liveCurrent = computeGoalCurrentAmount(g, walletBalanceMap);
        return {
            goal: g,
            liveCurrent,
            lifecycle: resolveGoalLifecycle(g, referenceDate, liveCurrent)
        };
    })
);
```
*Rationale*: Ensures that if a goal deadline occurred before `endDate`, it correctly displays as `overdue` at that point in time.

### 4. Sorting Architecture & `planningFilterStore`
Extend `planningFilterStore`:
- Add `goalSortBy: 'current_amount_desc' | 'target_amount_desc' | 'name' = 'current_amount_desc'`.
- Sort `filteredGoals`:
```ts
const sortedGoals = $derived.by(() => {
    const list = [...filteredGoals];
    const sort = planningFilterStore.goalSortBy;
    if (sort === 'current_amount_desc') {
        list.sort((a, b) => b.liveCurrent - a.liveCurrent || b.goal.targetAmount - a.goal.targetAmount);
    } else if (sort === 'target_amount_desc') {
        list.sort((a, b) => b.goal.targetAmount - a.goal.targetAmount || b.liveCurrent - a.liveCurrent);
    } else if (sort === 'name') {
        list.sort((a, b) => a.goal.goalName.localeCompare(b.goal.goalName));
    }
    return list;
});
```

### 5. Responsive UI Layout
- **Desktop (>= 1024px)**: Status tabs on the left, sort dropdown and Horizon toggle on the right.
- **Mobile (< 1024px)**: Horizontally scrollable status pills, compact sort select dropdown. Horizon toggle remains hidden (mobile is List-only per spec).

## Test Strategy

1. **Unit Tests (Vitest)**:
   - `planning-filter.test.ts`: Verify `goalSortBy` initial value (`current_amount_desc`), setter/getter, and `resetFilters()`.
   - `lifecycle.test.ts`: Test `resolveGoalLifecycle` with custom `referenceDate` and custom current amount.
2. **Integration & E2E Tests (Playwright / Vitest)**:
   - Verify Goal List sort order defaults to descending by `liveCurrent`.
   - Verify changing date filter updates the rendered accumulated amounts on derived goals.
   - Verify maximizing Horizon Board period switches to List view with matching point-in-time balances and sorted order.

## Risks / Trade-offs

- **Empty / Offline Wallet Cache**: If offline mock is active or wallet queries fail, fallback gracefully to `lw.balance` and `g.currentAmount` without crashing.
- **Foreign Currency Volatility**: Peg conversions use `getConvertedBalanceInIDR`, matching edge API and Horizon Board conventions.
