# Design: Cockpit & Dedicated Studios Architecture

## Context

The initial single-page implementation presented financial information as an "infographic" with low information density, literary serif typography, floating background blobs, and transactions sequestered inside slide-over drawers. For a user managing 17 accounts across 6 banks, 20 expense categories, and hundreds of transactions, compressing all entities into a single vertical page creates cognitive overload. 

This design establishes an **Executive Financial Cockpit & Dedicated Studios** (Hub & Spoke architecture) across 4 client-side routes (`/`, `/ledger`, `/accounts`, `/planning`), removing frivolous decorative elements and maximizing high-density data utility.

See `proposal.md` for background and motivation.

## Goals / Non-Goals

**Goals:**
- Transition from a single-page view to a multi-route SvelteKit SPA (`/`, `/ledger`, `/accounts`, `/planning`) sharing a unified, persistent Svelte 5 runes state (`reedrich.svelte.ts`).
- Deliver a dedicated, full-width **Ledger Studio** at `/ledger` with super dynamic filtering (Date range presets + custom picker, multi-wallet select grouped by bank, multi-category select, type, status, amount range slider, search with `/` shortcut, pagination, and real-time sums).
- Deliver a dedicated **Account Matrix** at `/accounts` displaying wallets grouped by bank with automatic per-bank subtotals, spendable vs locked partition badges, and direct navigation into that wallet's filtered ledger.
- Deliver a dedicated **Planning Studio** at `/planning` housing active budgets, multi-wallet derived goals (Sewa Rumah 2026), and active obligations with 13 recurring templates.
- Upgrade typography and styling: strip literary serif (`Newsreader`) and ambient drifting blobs; standardize on high-precision `Geist Sans` + `JetBrains Mono` with `font-variant-numeric: tabular-nums`.
- Ensure full automated test coverage: Vitest unit tests for calculations/filters, and Playwright E2E tests for multi-page navigation and ledger filtering.

**Non-Goals:**
- Backend API mutations or database migrations (the backend remains the existing Cloudflare Workers REST API).
- Server-side sessions or OAuth authentication flows (the application continues using the client-side API token stored in local state).

## Decisions

### 1. Hub & Spoke Navigation & Route Mapping
```
src/routes/
├── +layout.svelte         (App Shell: Global Topbar with 4 studio links, live sync bar)
├── +layout.ts             (SPA mode: ssr = false, prerender = true)
├── +page.svelte           (/ - Executive Cockpit Dashboard)
├── ledger/
│   └── +page.svelte       (/ledger - Super Dynamic Full-Width Ledger Studio)
├── accounts/
│   └── +page.svelte       (/accounts - Bank & Account Tree Matrix with Subtotals)
└── planning/
    └── +page.svelte       (/planning - Budgets, Goals & Obligations Studio)
```

- **Decision**: Keep global persistent state in `src/lib/stores/reedrich.svelte.ts` so route transitions happen in 0 milliseconds without re-fetching or reloading data.
- **Rationale**: Instant tab/page transitions provide an experience comparable to desktop software (like Linear or Raycast).

### 2. High-Density Executive Cockpit (`/`) Layout
```
+----------------------------------------------------------------------------------------------------+
| TOPBAR: [Maniyy Logo]  [Cockpit] [Ledger] [Accounts] [Planning]      [LIVE: IDR] [API Token: Sync] |
+----------------------------------------------------------------------------------------------------+
| EXECUTIVE KPI STRIP (4 Compact Metric Cards)                                                       |
| • Net Worth: Rp 17.33M  │ • Spendable: Rp 1.10M  │ • Locked/Cadangan: Rp 16.23M │ • Net Sav: +Rp 5.57M|
+----------------------------------------------------------------------------------------------------+
| CRITICAL RUNWAY & PACING ALERT                                                                     |
| [!] Sewa Rumah 2026: 21 hari lagi (Terkumpul Rp 14.23M / Rp 18.00M · Defisit Rp 3.77M)            |
+----------------------------------------------------------------------------------------------------+
| WORKBENCH 3-KOLOM (Desktop: 25% / 50% / 25%)                                                       |
|                                                                                                    |
| 1. BANK ACCOUNTS (25%)       │ 2. RECENT FEED (50%)                       │ 3. ALLOCATION (25%)    |
| • BCA: Rp 8.97M              │ 22 Sep  Point Coffee   Makan    -Rp 106k   │ Top Expenses (Sep):    |
|   - Main        Rp 141.9k    │ 22 Sep  Pengganti KFC  Transfer -Rp 120k   │ 1. Makan: 24.7% (Rp 4M)|
|   - Sewa (Lock) Rp 8.83M     │ 21 Sep  Topup GoPay    Transfer -Rp  20k   │ 2. Tagihan: 14.7%      |
| • Bank Jago: Rp 4.87M        │ 20 Sep  Tukang Unang   Rumah    -Rp 170k   │ 3. Nafkah: 12.5%       |
| • Bitget: 115.61 USDT        │ 19 Sep  VPS SumoPod    Operasi  -Rp 105k   │ 4. Cicilan: 8.0%       |
| [Kelola Akun →]              │ [Buka Ledger Lengkap (359 baris) →]        │ [Rencana Anggaran →]   |
+----------------------------------------------------------------------------------------------------+
```

### 3. Super Dynamic Ledger Studio (`/ledger`) Engine
- The ledger needs to handle 359+ transactions with instant reactivity.
- Filter criteria managed reactively in `ledgerState`:
  - `dateRange`: preset enum (`all`, `today`, `this_month`, `last_month`, `last_3_months`, `custom`) + `startDate` & `endDate`.
  - `walletIds`: `string[]` (supports multi-selection or bank-level selection).
  - `categories`: `string[]`.
  - `types`: `('expense' | 'income' | 'transfer')[]`.
  - `status`: `'all' | 'realized' | 'planned'`.
  - `search`: string (matches description, category, and ID).
  - `amountMin` & `amountMax`: numeric bounds.
- Live aggregate strip recalculates on every filter change: `totalCount`, `totalIncome`, `totalExpense`, `netFlow`.

### 4. Bank Hierarchy & Subtotals (`/accounts`)
- Group wallets by `wallet.institution`.
- For each group:
  - Compute subtotal in native currencies: `IDR` subtotal, `USDT` subtotal.
  - Count spendable vs locked accounts.
  - Each wallet row includes a "Lihat Mutasi" button that navigates directly to `/ledger?walletId=${wallet.walletId}`.

### 5. Financial Planning Studio (`/planning`)
- Workspace tabs:
  - **Pagu Belanja (Budgets)**: Limit vs Spent vs Remaining with alert tracks.
  - **Target Tabungan (Goals)**: Derived goals table showing underlying multi-wallet contributions and conversion rates.
  - **Kewajiban & Tagihan (Obligations & Recurring)**: Debts, loans, and 13 recurring transaction templates.

### 6. Design System & Typography Refinement
- **Typography**: Eliminate `Newsreader` serif; apply `Geist Sans` with clean weight hierarchy (`font-medium`, `font-semibold`) and `JetBrains Mono` with `font-variant-numeric: tabular-nums`.
- **Background**: Pure utilitarian `#F7F6F3` canvas, clean `#FFFFFF` cards, 1px `#EAEAEA` borders.
- **Pills**: Replace heavy pastel candy badges with subtle semantic status dots (`size-1.5 rounded-full`) and muted micro-text.

### 7. Test Strategy
- **Unit Tests (Vitest)**:
  - Ledger filter engine tests: date range filtering, wallet multi-selection, search queries, aggregate summation.
  - Bank grouping tests: subtotal summation across multiple institutions and currencies.
- **E2E Tests (Playwright)**:
  - `navigation.spec.ts`: Verify instant SPA navigation between `/`, `/ledger`, `/accounts`, and `/planning`.
  - `ledger-filters.spec.ts`: Test date preset filtering, search filtering, and URL query parameter syncing.
  - `accounts.spec.ts`: Verify bank grouping, subtotals, and navigation to filtered ledger.
  - `planning.spec.ts`: Verify budget utilization bars and goal pacing calculations.

## Risks / Trade-offs

- **Client-Side Filter Performance with Hundreds of Rows**:
  - *Mitigation*: 359 rows is lightweight in modern JavaScript (< 5ms for Array.prototype.filter). Memoized Svelte 5 `$derived` calculations prevent unnecessary recalculations.
- **Cross-Route Filter Continuity**:
  - *Mitigation*: When user clicks "Lihat Mutasi" from an account card, navigation passes `?walletId=...` in URL query params, which the ledger page reads on mount.
