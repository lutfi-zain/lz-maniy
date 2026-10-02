# Tasks


- [x] 1.1 In `apps/web/src/lib/stores/reedrich.svelte.ts`, create `allBudgets = $state<BudgetSnapshot[]>([])` and update `fetchBudgets()` to store into `this.allBudgets = items` without overwriting `this.snapshot.budgets`.
- [x] 1.2 In `apps/web/src/routes/planning/+page.svelte`, update budget references to use `reedrichStore.allBudgets.length > 0 ? reedrichStore.allBudgets : reedrichStore.activeBudgets`.
- [x] 1.3 Add unit test in `apps/web/src/lib/stores/reedrich.test.ts` verifying `fetchBudgets()` populates `allBudgets` while leaving `snapshot.budgets` intact.

## 2. Cockpit Date-Range Synchronization

- [x] 2.1 In `apps/web/src/routes/+page.svelte` (Cockpit), add a reactive `$effect` watching `dateFilterStore.startDate` and `dateFilterStore.endDate` to invoke `reedrichStore.fetchSnapshot({ startDate, endDate })` with `AbortController` cancellation.
- [x] 2.2 Verify that navigating between date presets in Cockpit triggers temporal snapshot re-fetch without errors.

## 3. Cockpit Widget Lifecycle Guards

- [x] 3.1 In `apps/web/src/lib/components/cockpit/CockpitAllocationWidget.svelte`, filter `budgets` using `resolveBudgetPeriod(b).isActive` so past completed budgets are excluded from the Active Budgets list.
- [x] 3.2 In `apps/web/src/lib/components/cockpit/CockpitAlertBanner.svelte`, import `resolveGoalLifecycle` and ensure the pacing alert only renders when `!lifecycle.isCompleted && !lifecycle.isOverdue && (sewaGoal.daysRemaining ?? 0) > 0 && deficit > 0`.

## 4. Verification & Validation

- [x] 4.1 Run unit test suite with `bun run test:web` and type checking with `bun run check:web`.
- [x] 4.2 Create Playwright test verifying that completed budgets do not render in Cockpit for current month and date filter re-fetches snapshots.
