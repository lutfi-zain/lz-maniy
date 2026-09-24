# Tasks: Refine Filters, Custom Date Range Picker, Multi-Currency & Precision UX

## 1. Multi-Currency Utilities & Centralized Valuation

- [ ] 1.1 Implement `getConvertedBalanceInIDR()` in `src/lib/utils/currency.ts` supporting live peg rate conversions for USDT/USD to IDR
- [ ] 1.2 Write Vitest unit tests in `src/lib/utils/currency.test.ts` for multi-currency conversion accuracy and edge cases
- [ ] 1.3 Update Cockpit and Account Matrix stores to use centralized IDR valuation across all summary tiles and group subtotals

## 2. Reusable Filter Primitives (`DateRangePicker` & `ComboboxMultiSelect`)

- [ ] 2.1 Implement `src/lib/components/ui/DateRangePicker.svelte` using `bits-ui` RangeCalendar with presets: "Bulan Ini" (default), "Bulan Depan", "Bulan Lalu", "Hari Ini", "Semua Waktu", and custom 2-click calendar
- [ ] 2.2 Implement `src/lib/components/ui/ComboboxMultiSelect.svelte` with autofocus search input, checkbox multi-selection, and institution group headers
- [ ] 2.3 Implement `src/lib/components/ui/StatusBadge.svelte` standardizing amber lock icon ("Cadangan") and green dot ("Operasional") with tooltips

## 3. Ledger Studio Fixes & Dynamic Filter Upgrades (`/ledger`)

- [ ] 3.1 Fix category filtering logic in `/ledger` to match `t.transactionCategoryId === categoryId`, properly displaying all 39+ Makan & Minum transactions
- [ ] 3.2 Integrate `DateRangePicker` into `/ledger` with default "Bulan Ini" preset and "Bulan Depan" capability
- [ ] 3.3 Integrate `ComboboxMultiSelect` into `/ledger` for wallets (grouped by bank) and categories
- [ ] 3.4 Add an explicit "Kategori" column to the ledger table with formatted category badges
- [ ] 3.5 Implement configurable pagination limits (25, 50, 100 rows per page) with bounded page navigation

## 4. Cockpit & Recent Ledger Upgrades (`/`)

- [ ] 4.1 Integrate `DateRangePicker` into `CockpitRecentLedger.svelte` so recent mutations can be filtered by date range on the cockpit home
- [ ] 4.2 Standardize status indicators in `CockpitBankWidget.svelte` and KPI cards using `StatusBadge`
- [ ] 4.3 Ensure clicking an expense category from Cockpit navigates to `/ledger?category=...` and matches transactions accurately

## 5. Account Matrix & Planning Studio Refinements (`/accounts` & `/planning`)

- [ ] 5.1 Refactor `/accounts` to support searching, sorting (balance, name, last transaction date), and grouping toggle
- [ ] 5.2 Remove redundant "Mata Uang:" and "Tipe:" labels from account rows and display exact formatted date/time for last transactions
- [ ] 5.3 Refactor Goal cards in `/planning` to sum multi-currency contributions (USDT/USD converted to IDR via live pegs) matching live total Rp 14.230.897

## 6. Testing, Quality & Automated Verification

- [ ] 6.1 Create Playwright E2E test `tests/category-filter.spec.ts` verifying clicking "Makan & Minum" renders 20+ transactions with category badges
- [ ] 6.2 Create Playwright E2E test `tests/date-range-picker.spec.ts` verifying 2-click date range selection and "Bulan Depan" preset
- [ ] 6.3 Create Playwright E2E test `tests/account-matrix.spec.ts` verifying sorting, searching, and label cleanup in `/accounts`
- [ ] 6.4 Execute full test suite (`bun test` and `bunx playwright test`), `bun run check`, `bun run lint`, and verify all pass
