# Proposal: Refine Filters, Date Range Picker, Multi-Currency & Precision UX

## Why

While the transition to the 4-studio architecture established solid navigational structure, real-world usage revealed several critical UX friction points:
1. When clicking an expense category (e.g., "Makan & Minum") from the cockpit, the ledger displays 0 records because it performs a string search against `transactionDescription` rather than matching `transactionCategoryId`.
2. Native `<select>` and `<input type="date">` elements require excessive scrolling across 17 wallets and 20 categories, lack multi-select capability, and provide inconsistent OS calendar popovers.
3. Foreign currency assets (Bitget 115.61 USDT) are not automatically converted into IDR in total calculations, undercounting goal accumulations and asset subtotals.
4. Status labels for Spendable vs Locked are visually inconsistent, and the Account Matrix lacks sorting, filtering, and timestamp clarity.

This change refines the filtering engine, introduces a custom 2-click date range picker with "Bulan Depan" and default "Bulan Ini", standardizes status indicators, and enforces multi-currency valuation consistency.

## What Changes

- **Custom 2-Click Date Range Picker (`DateRangePicker.svelte`)**:
  - Replaces native HTML date inputs with a custom calendar popover supporting 2-click range selection (Click 1: Start Date, Click 2: End Date with range highlight).
  - Includes a preset bar: `Bulan Ini` (**default selected**), `Bulan Depan` (for forward planning), `Bulan Lalu`, `Hari Ini`, `Semua Waktu`, and `Rentang Khusus`.
  - Reused consistently in both **Ledger Studio (`/ledger`)** and the **Mutasi Terkini** feed in Cockpit (`/`).
- **Searchable Multi-Select Combobox (`ComboboxMultiSelect.svelte`)**:
  - Eliminates long dropdown scrolling by providing an autofocus search input.
  - Supports multi-selection via checkboxes for wallets (grouped by institution) and categories.
  - Displays compact summary triggers (e.g. "BCA Main, Jago Taktis (2 akun)").
- **Category Filter & Table Fixes in `/ledger`**:
  - Resolves category filtering to match `t.transactionCategoryId === targetCat.categoryId`, accurately displaying all 39+ Makan & Minum transactions.
  - Adds an explicit "Kategori" column to the ledger table with clean category names.
  - Implements configurable pagination limits (25, 50, 100 per page) with a bounded pagination stepper.
- **Account Matrix Refinements (`/accounts`)**:
  - Adds search filter by wallet name, status filter (All, Operasional, Cadangan), and sorting (highest balance, name, last transaction date).
  - Strips redundant text labels (`"Mata Uang:"`, `"Tipe:"`), displaying direct tickers (`IDR`, `USDT`).
  - Displays formatted date and time for last transaction.
- **Status Indicator Harmonization**:
  - Replaces inconsistent colored badges with a uniform visual language:
    - Amber lock icon (`LockSimple`) + "Cadangan" for locked reserves.
    - Subtle green dot + "Operasional" for spendable cash.
- **Unified Multi-Currency Asset Valuation (USDT/USD to IDR)**:
  - In Goals (`/planning`): automatically sums multi-wallet contributions including USDT/USD converted to IDR via live pegs.
  - Enforces consistent IDR consolidated valuation across all KPI cards, account groups, and summary headers.

## Capabilities

### Modified Capabilities

- `ledger-studio`: Replaces native date inputs with 2-click DateRangePicker (preset "Bulan Ini" by default, "Bulan Depan"), replaces native selects with searchable multi-select comboboxes, fixes categoryId matching bug, adds Kategori column, and adds configurable pagination limits.
- `account-dashboard`: Integrates DateRangePicker into Cockpit's "Mutasi Terkini" feed, standardizes Cadangan vs Operasional status indicators, and enforces multi-currency conversion in all asset totals.
- `account-matrix`: Implements searching, sorting, and grouping for accounts, cleans up redundant labels ("Mata Uang", "Tipe"), and adds formatted timestamps for last transactions.
- `planning-studio`: Computes goal accumulated totals and pacing by converting all linked foreign currency wallets (USDT/USD) into IDR.

## Impact

- **Affected Components**:
  - New components: `src/lib/components/ui/DateRangePicker.svelte`, `src/lib/components/ui/ComboboxMultiSelect.svelte`.
  - Modified routes: `src/routes/ledger/+page.svelte`, `src/routes/accounts/+page.svelte`, `src/routes/planning/+page.svelte`, `src/routes/+page.svelte`.
  - Modified components: `src/lib/components/cockpit/CockpitRecentLedger.svelte`, `src/lib/components/cockpit/CockpitBankWidget.svelte`, `src/lib/components/cockpit/CockpitKpiStrip.svelte`.
  - State & Utils: `src/lib/stores/reedrich.svelte.ts`, `src/lib/utils/currency.ts`.
- **Dependencies**: Uses already-installed `@internationalized/date` and `bits-ui` (`range-calendar`, `popover`, `command`).
