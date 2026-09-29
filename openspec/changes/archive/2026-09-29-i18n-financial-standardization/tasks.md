# Tasks

## 1. Core i18n Engine & Dictionaries

- [x] 1.1 Create `apps/web/src/lib/i18n/types.ts` defining `TranslationSchema` and recursive type-safe key-path dot notation types.
- [x] 1.2 Create canonical English dictionary `apps/web/src/lib/i18n/locales/en.ts` with standardized GAAP/IFRS financial terminology across navigation, cockpit, ledger, accounts, planning, forms, and common labels.
- [x] 1.3 Create Indonesian dictionary `apps/web/src/lib/i18n/locales/id.ts` strictly matching `TranslationSchema` for complete key parity.
- [x] 1.4 Create reactive Svelte 5 runes store `apps/web/src/lib/i18n/index.ts` with `i18nStore`, `t()` resolver, parameter interpolation, fallback resolution, and `localStorage` persistence.
- [x] 1.5 Write unit tests in `apps/web/src/lib/i18n/__tests__/i18n.test.ts` verifying translation lookup, interpolation, English fallback, and 100% dictionary key parity between `en.ts` and `id.ts`.

## 2. Localized Financial & Date Formatters

- [x] 2.1 Refactor `apps/web/src/lib/utils/currency.ts` to support locale-aware currency separators (`en-US` comma/dot vs `id-ID` dot/comma) and compact notation (`K/M/B` vs `rb/jt/M`).
- [x] 2.2 Refactor `apps/web/src/lib/utils/dates.ts` (`dFmt`, `dFmtTime`, `mLabel`) to format dates dynamically according to `i18nStore.locale`.
- [x] 2.3 Write unit tests in `apps/web/src/lib/utils/__tests__/formatters.test.ts` verifying currency and date outputs for both `en` and `id` locales.

## 3. Global Navigation & Layout Components

- [x] 3.1 Refactor `apps/web/src/lib/components/layout/Topbar.svelte` and `BottomNav.svelte` to use `t()` and embed a language switcher toggle (`EN` | `ID`) inside the User Profile menu.
- [x] 3.2 Refactor `apps/web/src/lib/components/ui/DateRangePicker.svelte` and `apps/web/src/lib/stores/date-filter.svelte.ts` to render localized preset labels and date strings.

## 4. Cockpit & Dashboard Domain

- [x] 4.1 Refactor `CockpitKpiStrip.svelte`, `BentoKpiGrid.svelte`, and `KpiCard.svelte` to use standardized English financial metrics (Net Worth, Cashflow, Safe to Spend).
- [x] 4.2 Refactor `CockpitAllocationWidget.svelte`, `CockpitBankWidget.svelte`, `CockpitRecentLedger.svelte`, and `CockpitAlertBanner.svelte` with `t()` translation keys.

## 5. Ledger Studio & Horizon Board Domain

- [x] 5.1 Refactor `HorizonBoard.svelte`, `HorizonPeriodColumn.svelte`, and `AddPeriodCard.svelte` with standardized financial terms (Transactions, Plan Transaction, Inflow, Outflow).
- [x] 5.2 Refactor `PeriodSummaryCard.svelte` for localized Cashflow metrics, Point-in-time Net Worth, and Goal Snapshots.
- [x] 5.3 Refactor Ledger filter toolbar and transaction rows in `apps/web/src/routes/ledger/+page.svelte` and `TransactionDetailView.svelte`.

## 6. Accounts & Banking Domain

- [x] 6.1 Refactor `apps/web/src/routes/accounts/+page.svelte` toolbar, summary metrics (Total Assets, Spendable Balance, Committed Capital), and filter tabs.
- [x] 6.2 Refactor `WalletCard.svelte` and `WalletSection.svelte` with localized labels and badges.

## 7. Planning Studio Domain

- [x] 7.1 Refactor `apps/web/src/routes/planning/+page.svelte` sub-tab headers (Budgets, Savings Goals, Liabilities, Categories).
- [x] 7.2 Refactor `BudgetSection.svelte` and `BudgetCard.svelte` (Spending Limits, Utilization Pacing, Remaining Allowance).
- [x] 7.3 Refactor `GoalSection.svelte` and `GoalCard.svelte` (Target Pacing, Derived Allocations, Days Remaining).
- [x] 7.4 Refactor `ObligationSection.svelte` and `ObligationCard.svelte` (Debts / Payables, Loans / Receivables, Recurring Bills).
- [x] 7.5 Refactor `CategoryStudio.svelte`, `CategoryKpiStrip.svelte`, `CategoryControlsBar.svelte`, and `CategoryRowItem.svelte` with standardized financial English terms.

## 8. Drawers, CRUD Forms & Modals

- [x] 8.1 Refactor `TransactionFormDrawer.svelte` (Income, Expense, Transfer, Planned vs Realized) to use `t()`.
- [x] 8.2 Refactor `WalletFormContent.svelte` and `WalletDrawerContent.svelte`.
- [x] 8.3 Refactor `CategoryFormContent.svelte` and `CategoryDrawerContent.svelte`.
- [x] 8.4 Refactor `GoalFormContent.svelte` and `GoalDrawerContent.svelte`.
- [x] 8.5 Refactor `BudgetFormContent.svelte`, `RecurringFormContent.svelte`, `RecurringDetailContent.svelte`, and `ProfileFormContent.svelte`.

## 9. Verification & Quality Gates

- [x] 9.1 Run complete unit test suite with Vitest (`bun run --cwd apps/web test:unit`).
- [x] 9.2 Run SvelteKit typecheck (`bun run --cwd apps/web check`) ensuring 0 errors and 0 warnings.
- [x] 9.3 Run production build (`bun run --cwd apps/web build`) ensuring clean compilation.
