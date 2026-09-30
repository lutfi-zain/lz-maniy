# Tasks

## 1. Design System Tokens & Minimalist-UI Polish
- [x] 1.1 Declare `.serif` utility class in `apps/web/src/routes/layout.css` mapping to `'Newsreader', 'Playfair Display', 'Instrument Serif', Georgia, serif` with letter-spacing `-0.025em` and line-height `1.15`.
- [x] 1.2 Refine heavy drop shadows (`shadow-xl`, `shadow-lg`, `shadow-md`) across `DrilldownDrawer.svelte`, `TransactionFormDrawer.svelte`, `ComboboxSingleSelect.svelte`, `ComboboxMultiSelect.svelte`, `SingleDatePicker.svelte`, `DateRangePicker.svelte`, and `BottomNav.svelte` to ultra-diffuse ambient shadows (`border border-[#EAEAEA]` + `box-shadow: 0 4px 24px rgba(0,0,0,0.03)`).
- [x] 1.3 Replace default emoji category icons (`🏷️`, `🍔`, `🚗`, etc.) in `CategoryFormContent.svelte` and `category-form.svelte.ts` with crisp monochromatic Phosphor icon SVG primitives (`Tag`, `ForkKnife`, `Car`, `Briefcase`, `House`, `ShoppingCart`, etc.).

## 2. Data Contracts & Shared DTO Enhancement (`@maniyy/shared`)

- [x] 2.1 Update `GoalSnapshot` interface in `packages/shared/src/account-detail.ts` to include `notes?: string | null`, `targetDate?: string | null`, `pacing?: GoalPacingDTO`, and `status?: 'in_progress' | 'completed' | 'cancelled'`.
- [x] 2.2 Update `BudgetSnapshot` interface in `packages/shared/src/account-detail.ts` to include `periodStart?: string`, `periodEnd?: string`, `notes?: string | null`, and ensure `spent`, `remaining`, and `percentUsed` are typed.
- [x] 2.3 Update `TransactionRecord` interface in `packages/shared/src/account-detail.ts` to include `transactionOccurrenceDate?: string | null`, `transactionRealizedAt?: string | null`, `transactionPlannedAmount?: number | null`, and `transactionTemplateId?: string | null`.
- [x] 2.4 Verify shared package compilation with `bun run check` across the monorepo.

## 3. Lifecycle Engine & Store Fetchers

- [x] 3.1 Create `$lib/utils/lifecycle.ts` implementing `resolveGoalLifecycle(goal: GoalSnapshot)` (`completed`, `overdue`, `in_progress`, `long_term`) and `resolveBudgetPeriod(budget: BudgetSnapshot)` (`active_period`, `past_period`).
- [x] 3.2 Add standalone and by-ID fetchers to `reedrichStore` in `apps/web/src/lib/stores/reedrich.svelte.ts`: `fetchGoalById(id)`, `fetchBudgetById(id)`, `fetchWalletById(id)`, and `fetchTransactionById(id)`.
- [x] 3.3 Add standalone list fetchers to `reedrichStore`: `fetchGoals(status?)` and `fetchBudgets()`.
- [x] 3.4 Write unit tests in `apps/web/src/lib/utils/lifecycle.test.ts` covering all lifecycle boundaries, overdue deadlines, and budget period edges.

## 4. Pre-Edit Server Hydration in Form Stores

- [x] 4.1 Update `goalFormStore` (`apps/web/src/lib/stores/goal-form.svelte.ts`) with `openEditWithHydration(goalId: string)` that fetches fresh goal detail via `reedrichStore.fetchGoalById` and manages `isHydrating` state.
- [x] 4.2 Update `budgetFormStore` (`apps/web/src/lib/stores/budget-form.svelte.ts`) with `openEditWithHydration(budgetId: string)` that fetches fresh budget detail via `reedrichStore.fetchBudgetById`.
- [x] 4.3 Update `walletFormStore` and `transactionFormStore` with server hydration capability prior to opening edit mode.
- [x] 4.4 Add skeleton loading indicators in `GoalFormContent.svelte`, `BudgetFormContent.svelte`, and `TransactionFormDrawer.svelte` when `isHydrating` is true.

## 5. Drawer Detail Views Enhancement (Full Fields Display)

- [x] 5.1 Update `GoalDrawerContent.svelte` to render the Target Notes section (`goal.notes`), Target Date with days remaining/overdue, and Pacing Recommendation cards (`requiredDailySavings`, `requiredMonthlySavings`).
- [x] 5.2 Update `BudgetDrawerContent.svelte` to render active period range dates (`dFmt(periodStart)` - `dFmt(periodEnd)`), category tag, and notes.
- [x] 5.3 Update `WalletDrawerContent.svelte` to render account classification badges and latest transaction preview using fresh data from `fetchWalletById`.
- [x] 5.4 Update `TransactionDetailView.svelte` to display linked recurring template badges, occurrence dates, and realization timestamps.

## 6. Planning Studio Lifecycle Filtering & Differentiator Badges

- [x] 6.1 Update `apps/web/src/routes/planning/+page.svelte` Goals section to render a segmented status tab bar: `Semua`, `Aktif (In Progress)`, `Lewat Tenggat (Overdue)`, and `Tercapai (Completed)` with dynamic count pills.
- [x] 6.2 Update Goal cards to render lifecycle badges: warning overdue badge (`⚠️ LEWAT TENGGAT`, `bg-[#FDEBEC] text-[#9F2F2D]`) and completed badge (`✓ TERCAPAI`, `bg-[#EDF3EC] text-[#346538]`).
- [x] 6.3 Update `apps/web/src/routes/planning/+page.svelte` Budgets section to render a period segmented bar: `Periode Berjalan (Bulan Ini)`, `Riwayat Lampau`, and `Semua`.
- [x] 6.4 Style historical/past budgets with subtle visual muting (opacity 85%) and expired period labels.

## 7. Verification & Automated Test Suites

- [x] 7.1 Execute full unit test suite with `bun run test:unit` and verify all tests pass.
- [x] 7.2 Run TypeScript and Svelte diagnostics with `bun run check` and confirm 0 errors.
- [x] 7.3 Author comprehensive end-to-end test suite in `tests/entity-lifecycle.spec.ts` covering segmented filtering, overdue warning indicators, drawer notes rendering, and pre-edit hydration.
- [x] 7.4 Execute Playwright E2E tests with `bun run test:e2e tests/entity-lifecycle.spec.ts`.
- [x] 7.5 Run linter and formatter checks with `bun run lint` and `bun run format`.
