# Proposal

## Why

While the Ledger Studio (`/ledger`) now features a point-in-time global Net Worth anchor, users cannot currently discern how much of that projected, current, or historical net worth is unencumbered operational cash (*Spendable / Bebas*) versus earmarked reserves (*Locked / Cadangan*). Furthermore, the application currently lacks a way to inspect the specific per-wallet balances that constitute that balance sheet at any selected date horizon. 

By equipping the Ledger anchor with a Spendable vs. Locked breakdown and transforming `/accounts` into a dynamic timeline matrix driven by date range filtering, users gain complete visibility into their liquidity composition across time and can seamlessly drill down into individual wallet contributions.

## What Changes

- **Ledger Studio Spendable vs. Locked Anchor Breakdown (`/ledger`)**:
  - Enhances `calculatePointInTimeNetWorth()` in `src/lib/utils/networth-timeline.ts` to track and return `spendableAmount` and `lockedAmount` across all three horizons (future projections, current liquidity, and historical closing balances).
  - Renders breakdown metrics directly in the Ledger summary strip on desktop (`● Bebas: Rp X · 🔒 Cadangan: Rp Y`) and as a compact 2-column bar on mobile.
  - Adds a direct action link `Rincian Akun →` carrying the active date preset over to `/accounts`.
- **Dynamic Balance Sheet Timeline Studio (`/accounts`)**:
  - Integrates the shared 2-click `DateRangePicker` component into the `/accounts` control bar with presets (`Bulan Ini` [default], `Bulan Depan`, `Bulan Lalu`, `Hari Ini`, `Semua Waktu`, and custom ranges).
  - Implements `calculatePointInTimeWalletBalances()` to calculate exact timeline balances for every individual wallet at $T_{\text{akhir}}$ (accounting for planned incomes, expenses, and intra-wallet transfers).
  - Recomputes institution subtotals, spendable/locked totals, and grand totals reactively based on the selected timeline horizon.
  - Preserves compatibility with existing filter toggles (`[Semua]`, `[Operasional]`, `[Cadangan]`), allowing users to inspect which specific wallets compose the spendable or locked projection.

## Capabilities

### Modified Capabilities
- `ledger-studio`: Updates `Requirement: Dynamic Filtered Financial Aggregates` to specify the Spendable vs. Locked breakdown in the global anchor with quick drilldown link to accounts.
- `account-matrix`: Updates `Requirement: Hierarchical Institution Grouping with Subtotals` and `Requirement: Granular Account Status & Currency Breakdown` to specify date range timeline filtering, dynamic per-wallet balance calculations, and reactive subtotals.

## Impact

- **User Experience**: Users immediately know their true operational liquidity runway (spendable vs locked) in `/ledger`, and can inspect the exact future or historical balance of any bank account in `/accounts`.
- **Components & Utils**: Updates `src/lib/utils/networth-timeline.ts`, `src/lib/utils/networth-timeline.test.ts`, `src/routes/ledger/+page.svelte`, and `src/routes/accounts/+page.svelte`.
- **Breaking Changes**: None. Default behavior when visiting `/accounts` without date filters retains current live balances.
