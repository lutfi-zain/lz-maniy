# Design: i18n & Financial Terminology Standardization

## Context

See `proposal.md` for background and motivation. The frontend `apps/web` contains 75 Svelte components and 42 TypeScript modules utilizing mixed, informal Indonesian strings and hardcoded `'id-ID'` formatters. This design details the Svelte 5 runes reactive translation engine, localized formatting utilities, GAAP/IFRS terminology alignment, responsive locale switcher UI, and verification strategy.

## Goals / Non-Goals

**Goals:**
- Provide zero-bloat, compile-time type-safe translation dictionaries (`en.ts` canonical, `id.ts` fallback).
- Establish reactive locale switching via Svelte 5 runes (`$state`, `$derived`) with persistent storage.
- Align all visual typography, labels, KPI cards, tables, forms, and drawers with institutional financial English conventions.
- Implement locale-sensitive number, currency, compact notation, and date formatters.
- Provide comprehensive unit tests verifying 100% dictionary key parity and formatting behavior.

**Non-Goals:**
- Runtime remote localization fetching or backend translation services.
- External heavyweight i18n frameworks that inject global DOM observers or manipulate SvelteKit URL routing.
- Translating user-generated entity names (e.g. specific wallet names or custom category titles).

## Architecture & State Machine

```ascii
+---------------------------------------------------------------------------------------+
|                                    i18nStore                                          |
|                                                                                       |
|   locale: $state<'en' | 'id'>('en')                                                   |
|   dict: $derived(locale === 'en' ? en : id)                                           |
|   t(keyPath, params?): resolves dotted key against dict with English fallback         |
|   setLocale(next): updates $state & persists to localStorage('maniyy_locale')         |
+---------------------------------------------------------------------------------------+
           |                                                       |
           v                                                       v
+-------------------------------+               +---------------------------------------+
|       Localized Formatters    |               |               UI Consumers            |
|                               |               |                                       |
| - fmtCurrency(amt, cur, loc)  |               | - Topbar & BottomNav                  |
| - fmtIDR(amt, loc)            |               | - BentoKpiGrid & Cockpit Widgets      |
| - fmtCompactIDR(amt, loc)     |               | - LedgerStudio & HorizonBoard         |
| - dFmt(dateStr, loc)          |               | - Accounts & Wallets Matrix           |
| - dFmtTime(dateStr, loc)      |               | - PlanningStudio & CategoryMatrix     |
| - mLabel(monthKey, loc)       |               | - Entity Drawers & Action Forms       |
+-------------------------------+               +---------------------------------------+
```

## Technical Decisions

### Decision 1: Type-Safe Svelte 5 Runes Dictionary Engine
- **Approach**: Define the dictionary structure as a nested TypeScript object in `apps/web/src/lib/i18n/locales/en.ts`. Derive `type TranslationSchema = typeof en;` and enforce `const id: TranslationSchema = { ... }` in `id.ts`.
- **Key Access**: Implement `t(key: DotNestedKeys<TranslationSchema>, params?: Record<string, string | number>): string`.
- **Fallback**: If key resolution in `id.ts` returns undefined or empty, recursively fall back to `en.ts`.
- **Why**: Zero runtime bloat, instant Vite HMR, and TypeScript immediately flags missing keys or typos at build time.

### Decision 2: Locale-Aware Currency and Number Formatting
- **English (`en`)**:
  - Currency: `Rp 14,230,897.52` (comma for thousands, period for decimals).
  - Compact: `Rp 5.5M`, `Rp 250K`, `Rp 1.2B`.
- **Indonesian (`id`)**:
  - Currency: `Rp 14.230.897,52` (period for thousands, comma for decimals).
  - Compact: `Rp 5,5 jt`, `Rp 250 rb`, `Rp 1,2 M`.
- **Implementation**: The currency formatting helpers in `apps/web/src/lib/utils/currency.ts` are updated to accept an optional locale parameter or read from `i18nStore.locale` by default.

### Decision 3: Standard Financial Terminology Dictionary (GAAP/IFRS Aligned)

```ascii
+------------------------------+------------------------------+---------------------------------------+
| Context Domain               | Legacy Indonesian Term       | Standard Financial English (en)       |
+------------------------------+------------------------------+---------------------------------------+
| Net Worth Overview           | Kekayaan Bersih Konsolidasi  | Consolidated Net Worth                |
| Net Worth Breakdown          | Saldo Bebas / Terkunci       | Spendable Balance / Committed Funds   |
| Cashflow Operational         | Arus Kas / Pemasukan/Keluar  | Net Cashflow / Inflow / Outflow       |
| Categorized Cashflow         | Pemasukan / Pengeluaran      | Income / Expenses                     |
| Ledger Workspace             | Mutasi / Mutasi Terkini      | Transactions / Recent Transactions    |
| Horizon Period Board         | Rencanakan Transaksi         | Schedule / Plan Transaction           |
| Banking & Wallets            | Dompet & Rekening            | Accounts & Wallets                    |
| Internal Transfers           | Transfer Antar Dompet        | Account Transfer                      |
| Spending Pacing              | Pagu Anggaran / Sisa Pagu    | Budget / Budget Allowance / Remaining |
| Savings Goals                | Target Tabungan / Derived    | Savings Goals / Target Allocation     |
| Liabilities & Payables       | Hutang & Pinjaman            | Liabilities / Payables & Receivables  |
| Scheduled debits             | Tagihan Rutin                | Recurring Bills / Subscriptions       |
| Category Breakdown           | Porsi Pengeluaran / Terbesar | Spending Distribution / Top Category  |
| Filter Controls              | Hanya Ada Mutasi             | Active Only / With Activity           |
+------------------------------+------------------------------+---------------------------------------+
```

### Decision 4: Responsive UI Layout & Language Switcher Placement
- **Desktop (>= 1024px)**:
  - Language toggle (`EN` | `ID`) placed inside the Topbar User Profile dropdown menu with clear visual indication of the active locale.
  - Optional compact pill (`EN`/`ID`) next to the Sync button for instant one-click switching.
- **Mobile (< 1024px)**:
  - Language toggle accessible in the User Profile modal / drawer and embedded in BottomNav settings.
  - Ensures no layout shift on mobile toolbars.

## Risks & Mitigations

1. **Risk: Missing translation key causing broken UI rendering.**
   - *Mitigation*: The `t()` function implements strict fallback to English, and Vitest includes a dictionary parity test that fails CI if any key in `en.ts` is absent in `id.ts`.
2. **Risk: Number format differences causing parse errors in form inputs.**
   - *Mitigation*: Input fields store raw unformatted numbers (`number` primitives) in state; formatting is applied strictly on visual presentation or blur events.
3. **Risk: Text length differences causing layout breakage (e.g. German/Indonesian expansion).**
   - *Mitigation*: Container toolbars and buttons use flexible wrapping and minimum widths (`min-w-[...] sm:flex-none`) proven during the category toolbar layout optimization.

## Testing Strategy

- **Unit Testing (Vitest)**:
  - `i18nStore.test.ts`: Verify locale switching, fallback behavior, and parameter interpolation.
  - `dictionary-parity.test.ts`: Automatically traverse `en.ts` and `id.ts` keys to guarantee 100% key parity.
  - `currency.test.ts`: Test currency and compact formatting under both `en` and `id` locales.
  - `dates.test.ts`: Verify `dFmt`, `dFmtTime`, and `mLabel` formatting across locales.
- **End-to-End Testing (Playwright)**:
  - Toggle language between English and Indonesian in the UI.
  - Verify that Cockpit KPI headers, Ledger column headers, and Planning tabs reactively reflect the chosen language.
