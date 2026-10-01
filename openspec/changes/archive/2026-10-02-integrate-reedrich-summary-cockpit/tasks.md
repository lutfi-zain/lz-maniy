# Tasks

## 1. Domain Types & Mock Data Synchronization

- [x] 1.1 Add `FinancialSummary`, `SafeToSpendDetails`, and `CashflowProjections` types to `apps/web/src/lib/types/account-detail.ts`.
- [x] 1.2 Update `apps/web/src/lib/stores/mock-data.ts` with comprehensive `MOCK_SUMMARY` supporting surplus and deficit test states.
- [x] 1.3 Verify TypeScript typecheck on `apps/web` with `bun run --cwd apps/web check`.

## 2. Store Layer Integration in `ReedrichStore`

- [x] 2.1 Add `summary` reactive `$state` rune and `fetchSummary()` method in `apps/web/src/lib/stores/reedrich.svelte.ts`.
- [x] 2.2 Wire parallel execution of `fetchSummary()` inside `fetchSnapshot()` with resilient mock fallback.
- [x] 2.3 Implement `repayDebtLoan()` calling `POST /api/v1/debts-loans/{id}/repay` and `applyRecurringTemplate()` calling `POST /api/v1/recurring-templates/{id}/apply`.
- [x] 2.4 Add unit tests in `apps/web/src/lib/stores/reedrich.test.ts` and `apps/web/src/lib/stores/reedrich-crud.test.ts`.

## 3. Cockpit KPI Strip & Dynamic Alert Banner

- [x] 3.1 Update `CockpitKpiStrip.svelte` to render true `safeToSpend` and `dailySafeToSpend` with conditional deficit styling.
- [x] 3.2 Refactor `CockpitAlertBanner.svelte` to dynamically render runway deficit warnings and critical goal pacing alerts without hardcoded strings.
- [x] 3.3 Verify unit test rendering for KPI Strip and Alert Banner.

## 4. Cockpit 30-Day Forward Cashflow Widget & Planned Quick Action

- [x] 4.1 Create `CockpitCashflowTimeline.svelte` rendering lookahead cashflow totals and upcoming bill events.
- [x] 4.2 Integrate `CockpitCashflowTimeline.svelte` into Cockpit layout in `apps/web/src/routes/+page.svelte`.
- [x] 4.3 Add inline "Terapkan" action on planned recurring rows in `CockpitRecentLedger.svelte`.

## 5. End-to-End Validation & Verification

- [x] 5.1 Run full frontend test suite with `bun run --cwd apps/web test:unit`.
- [x] 5.2 Run `svelte-check` with `bun run --cwd apps/web check`.
- [x] 5.3 Run Playwright test suite for Cockpit workflows.
