# Proposal

## Why

When reviewing the transaction ledger at `/ledger` under future or planned filters (such as "Bulan Depan"), the current summary strip displays a negative `Net Arus Kas` (Inflow − Outflow) whenever planned commitments exceed recorded period income. Because this metric strictly measures period flow without accounting for existing cash balance or consolidated net worth, it triggers false-alarm financial anxiety—making the user feel in an operational deficit even when their multi-wallet net worth comfortably covers all obligations. 

By introducing a dual-layer summary strip that pairs localized filter flows with a global point-in-time Net Worth anchor, the user receives both granular filter statistics and reassuring, mathematically rigorous balance sheet reality.

## What Changes

- **Dual-Layer Summary Strip Architecture in `/ledger`**:
  - **Left Zone (Local Filter Scope)**: Displays matching transaction count, total inflows (`Masuk: +Rp X`), total outflows (`Keluar: −Rp Y`), and net filtered flow (`Net Terfilter: ±Rp Z`) based strictly on active filters (wallets, categories, types, status, search).
  - **Right Zone (Global Balance Sheet Anchor)**: Displays a global point-in-time Net Worth metric anchored to the filter's ending horizon ($T_{\text{akhir}}$), independent of category/wallet filter narrowing.
- **Deterministic Point-in-Time Net Worth Logic based on $T_{\text{akhir}}$**:
  - **Future Horizon ($T_{\text{akhir}} > \text{current month}$)**: Displays `PROYEKSI NET WORTH` ($\text{Current Net Worth} + \text{Net Planned Inflow/Outflow up to } T_{\text{akhir}}$) with subtext indicating post-plan projection date.
  - **Present / Current Month / All-Time ($T_{\text{akhir}} \text{ in current month or unbounded}$)**: Displays `NET WORTH SAAT INI` (live consolidated net worth) with subtext indicating consolidated liquidity position.
  - **Past Horizon ($T_{\text{akhir}} < \text{current month}$)**: Displays `NET WORTH PENUTUPAN` ($\text{Current Net Worth} − \text{Settled Net Flow between } T_{\text{akhir}} \text{ and today}$) with subtext indicating historical closing balance date.
- **Clean Utilitarian UI Without Hidden Tooltips**:
  - Replaces hidden tooltip dependency with an integrated, scannable two-line display (uppercase tracking label, tabular bold monospaced number, and subdued provenance subtext).

## Capabilities

### New Capabilities
*(None - leverages and extends existing ledger studio capability)*

### Modified Capabilities
- `ledger-studio`: Updates `Requirement: Dynamic Filtered Financial Aggregates` to specify the dual-layer summary strip architecture, combining localized filter aggregates with global timeline-anchored Net Worth calculations based on $T_{\text{akhir}}$.

## Impact

- **User Experience**: Completely eliminates psychological anxiety when planning future months with negative periodic cashflow, while preserving accurate transaction filtering and adding historical point-in-time closing balance awareness.
- **Components & Stores**: Refactors `src/routes/ledger/+page.svelte` summary section; adds reactive derivation helper for point-in-time Net Worth calculation based on `reedrichStore.snapshot.consolidatedNetWorth` and `reedrichStore.allTransactions`.
- **Breaking Changes**: None. All existing filter controls, sorting, pagination, and URL parameters remain fully compatible.
