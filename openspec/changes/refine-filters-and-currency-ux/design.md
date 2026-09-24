# Design: Refine Filters, Custom Date Range Picker, Multi-Currency & Precision UX

## Context

Following the multi-studio migration, real user workflows revealed several usability gaps:
1. Category filtering in `/ledger` looked for exact substring matches in `transactionDescription` rather than matching `transactionCategoryId`. This caused 0 records to be returned when clicking "Makan & Minum", even though 39 transactions totaling Rp 20M exist in the account.
2. Standard HTML `<select>` and `<input type="date">` controls lack search capabilities, require scrolling through long lists, and offer awkward date-picking ergonomics across operating systems.
3. Foreign currencies like USDT on Bitget are not consistently converted into IDR when computing totals for multi-wallet derived goals or aggregated asset cards.
4. "Locked / Spendable" status styling is inconsistent across pages, and the Account Matrix lacks sorting and clear timestamps.

See `proposal.md` for detailed scope.

## Goals / Non-Goals

**Goals:**
- Implement `DateRangePicker.svelte`: Custom 2-click calendar popover (Click 1: Start Date, Click 2: End Date with visual range highlight) with preset buttons: `Bulan Ini` (**default selected**), `Bulan Depan`, `Bulan Lalu`, `Hari Ini`, `Semua Waktu`, and `Rentang Khusus`.
- Implement `ComboboxMultiSelect.svelte`: Searchable popover combobox with instant text filtering, checkbox multi-selection, and group headers for institutions.
- Fix `/ledger` category filtering bug by matching `t.transactionCategoryId === selectedCategoryRecord.categoryId`, and add an explicit "Kategori" column.
- Integrate `DateRangePicker` into Cockpit's "Mutasi Terkini" (`CockpitRecentLedger.svelte`).
- Add configurable pagination page sizes (25, 50, 100) and bounded stepper in `/ledger`.
- Standardize status indicators: quiet amber lock icon (`LockSimple`) + "Cadangan" for locked reserves; subtle green dot + "Operasional" for spendable cash.
- Refine `/accounts`: add search input, sort controls (balance, name, last transaction), grouping toggle, remove redundant labels ("Mata Uang:", "Tipe:"), and display exact last transaction dates/times.
- Unify multi-currency calculations: provide a central helper `getConvertedBalanceInIDR()` so USDT is accurately converted and included in Goal totals and asset sums.

**Non-Goals:**
- Introducing external charting libraries or heavy date packages (we leverage `@internationalized/date` and `bits-ui` which are already installed).
- Backend schema changes (the Cloudflare Workers REST API remains unchanged).

## Decisions

### 1. Custom 2-Click Date Range Picker Architecture (`src/lib/components/ui/DateRangePicker.svelte`)
- Built using `bits-ui/range-calendar` and `@internationalized/date` (`CalendarDate`, `getLocalTimeZone`, `today`).
- Features a compact trigger button showing the active range label (e.g. "Bulan Ini: 1 Sep - 30 Sep 2026").
- Inside the popover:
  - Top preset row: `Bulan Ini` (default active), `Bulan Depan`, `Bulan Lalu`, `Hari Ini`, `Semua`.
  - 2-month or 1-month interactive calendar grid:
    - First click sets `start`.
    - Hover preview highlights intermediate dates.
    - Second click sets `end` and immediately closes the popover or updates live.
- Presets calculate boundary dates dynamically:
  - `this_month`: 1st day of current month to last day of current month.
  - `next_month`: 1st day of next month to last day of next month (critical for planning upcoming bills/paychecks!).
  - `last_month`: 1st day of previous month to last day of previous month.
  - `all`: empty bounds.

### 2. Searchable Multi-Select Combobox Architecture (`src/lib/components/ui/ComboboxMultiSelect.svelte`)
- Built using `bits-ui/popover` + `bits-ui/command` (or lightweight autofocus input) + `bits-ui/checkbox`.
- When opened:
  - Input field automatically gains focus.
  - Typing immediately filters items without scrolling.
  - Items display a checkbox with label and optional subtext (e.g. account balance or count).
  - Selected items are stored as `string[]` (IDs or names).
  - "Pilih Semua" and "Reset" quick actions.

### 3. Category ID Matching Fix in `/ledger`
- Current flaw: `!(t.transactionDescription || '').toLowerCase().includes(selectedCategory.toLowerCase())`.
- New implementation:
```typescript
if (selectedCategoryIds.length > 0) {
  if (!t.transactionCategoryId || !selectedCategoryIds.includes(t.transactionCategoryId)) {
    return false;
  }
}
```
- A category helper `getCategoryName(id)` resolves `transactionCategoryId` to its human-readable name (e.g. "Makan & Minum").
- The ledger table adds a dedicated "Kategori" column displaying clean, semantic category tags.

### 4. Multi-Currency Valuation Architecture
- Central utility in `src/lib/utils/currency.ts`:
```typescript
export function getConvertedBalanceInIDR(
  balance: number,
  currency: string,
  liveRates?: Record<string, number>
): number {
  if (currency.toUpperCase() === 'IDR') return balance;
  // Live peg from account-detail snapshot or rate table (1 USDT ≈ 17.835 IDR)
  const rate = liveRates?.[currency.toUpperCase()] ?? 17835.83;
  return balance * rate;
}
```
- In `/planning` (Goals): `currentAmount` in `Sewa Rumah 2026` sums `lw.convertedAmount` across all 4 wallets, ensuring the Bitget USDT wallet contributes Rp 2.061.999 to the total Rp 14.230.897.

### 5. Standardized Status Badge Visual Language
- Defined in `src/lib/components/ui/StatusBadge.svelte`:
  - `type="locked"` -> Amber lock icon + `<span class="text-xs text-[#956400]">Cadangan</span>` with tooltip "Dana cadangan / pos darurat".
  - `type="spendable"` -> Green dot + `<span class="text-xs text-[#346538]">Operasional</span>` with tooltip "Kas operasional siap dibelanjakan".

## Test Strategy

- **Unit Tests (Vitest)**:
  - `currency.test.ts`: test `getConvertedBalanceInIDR()` with IDR, USDT, and custom live exchange rates.
  - `filter.test.ts`: test category ID matching, date preset boundaries (especially `next_month`), and multi-select filtering.
- **E2E Tests (Playwright)**:
  - `category-filter.spec.ts`: Test navigating from Cockpit "Makan & Minum" to `/ledger`, verifying 20+ transactions are rendered with the category name visible.
  - `date-range-picker.spec.ts`: Test changing date range preset from "Bulan Ini" to "Bulan Depan" and verifying ledger and cockpit update accordingly.
  - `accounts-matrix.spec.ts`: Test search and sort controls in `/accounts`, verifying clean tickers (`IDR`, `USDT`) without redundant labels.

## Risks / Trade-offs

- **Calendar Popover Positioning on Mobile (< 375px)**:
  - *Mitigation*: The calendar popover uses responsive centering / bottom-sheet styling on mobile screens to prevent viewport clipping.
- **Handling Transactions without Category ID**:
  - *Mitigation*: Uncategorized transactions are grouped under "Tanpa Kategori" so they can still be filtered and inspected.
