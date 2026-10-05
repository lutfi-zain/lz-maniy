## Why

Three related gaps in the Ledger and Planning studios degrade financial intelligence clarity:

1. **Broken cross-page filter handoff**: Links from Planning → Ledger pass `?search=<name>` (goals, debts, loans, recurring), but the Ledger `onMount` never reads the `search` query parameter, so users land on an unfiltered view.
2. **Missing cashflow liquidity decomposition**: The Reedrich horizon API (`GET /api/v1/analytics/horizon`) now returns `cashflow.netSpendable` and `cashflow.netLocked` per period, but the frontend `HorizonPeriodSummary` type and `PeriodSummaryCard` do not consume them. Users cannot see how their net cashflow splits between spendable runway and locked savings.
3. **Confusing Net Worth labels across pages**: The Accounts page (`/accounts`) shows live wallet balances labeled "NET WORTH SAAT INI" while the Ledger Horizon Board shows roll-forward projected end-of-month balances using the same label style, with no visual distinction. The ~Rp 18jt gap between live vs projected confuses users inspecting the same month.

## What Changes

- **Ledger `?search=` query parameter intake**: Read `search` from `page.url.searchParams` during `onMount` and assign it to `searchKeyword`, which reactively triggers the server-driven query effect and populates the search input.
- **`HorizonPeriodSummary` type extension**: Add optional `netSpendable` and `netLocked` to the `cashflow` object in `packages/shared/src/account-detail.ts`.
- **`PeriodSummaryCard` cashflow decomposition row**: Display `netSpendable` (label: "Net Operasional") and `netLocked` (label: "Net Cadangan") as a sub-breakdown beneath the existing Net Cashflow / Inflow / Outflow rows when the fields are present, using the existing spendable (green `#346538`) and locked (amber `#956400`) color coding with dot indicators.
- **`HorizonBoard` summary computation**: Pass `cashflow.netSpendable` and `cashflow.netLocked` from the server horizon data through to `PeriodSummary`.
- **Horizon Board period header label clarification**: Add a disambiguating label to the `PeriodSummaryCard` Net Worth section that distinguishes projected values ("PROYEKSI AKHIR BULAN") from live values ("NET WORTH SAAT INI") and historical closings ("NET WORTH PENUTUPAN"), matching the logic already used in the Ledger List View right-zone.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `ledger-studio`: (`openspec/specs/ledger-studio/spec.md`) Add inbound `search` query parameter support for cross-page navigation from Planning, and require cashflow decomposition display in period summary cards when `netSpendable`/`netLocked` are available.
- `horizon-board`: (`openspec/specs/horizon-board/spec.md`) Require period summary cards to display cashflow liquidity decomposition and clarify Net Worth projection labels per period temporal position.

## Impact

- **Non-Goals**:
  - Changing how `netSpendable`/`netLocked` are computed on the backend (that is the finnplan-mcp `cashflow-spendable-locked-partition` change).
  - Modifying the Accounts page Net Worth computation or labeling (separate concern).
  - Adding `netSpendable`/`netLocked` to the Ledger List View summary strip (only the Horizon Board PeriodSummaryCard for now).
- **Breaking Changes**: None. All frontend-only, purely additive.
- **Dependencies**: Requires that the Reedrich horizon API already returns `cashflow.netSpendable` and `cashflow.netLocked` per period (confirmed: finnplan-mcp task 1.1 is complete). Fields are optional — the UI gracefully omits the decomposition row when absent.
