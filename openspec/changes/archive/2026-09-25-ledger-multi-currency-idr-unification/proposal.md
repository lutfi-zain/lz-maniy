# Proposal

## Why

Currently, transaction aggregation in the Ledger Studio (`/ledger`) and timeline Net Worth calculations in `networth-timeline.ts` treat all transaction amounts as pure raw numbers without resolving the originating wallet's currency. For transactions belonging to foreign-currency wallets (such as Bitget holding USDT), an expense of 10 USDT is subtracted as 10 IDR rather than its live peg valuation (~Rp 178.358), causing a distortion of over 17,000x in periodic net cashflow, historical closing balances, and future projected net worth.

By unifying all financial aggregations and primary row amounts into Indonesian Rupiah (IDR) as the definitive single currency ground truth, all calculations across the ledger become mathematically sound, reliable, and immune to multi-currency dimensional mismatches.

## What Changes

- **Currency-Aware Point-in-Time Net Worth (`src/lib/utils/networth-timeline.ts`)**:
  - Enhances `calculatePointInTimeNetWorth()` to accept wallet currency mappings (or wallet records) and compute every transaction delta in IDR using `getConvertedBalanceInIDR()`.
  - Future projections (`PROYEKSI NET WORTH`) and historical closing balances (`NET WORTH PENUTUPAN`) now accurately reflect the full converted value of non-IDR transactions.
- **Universal IDR Aggregates in `/ledger` (`src/routes/ledger/+page.svelte`)**:
  - Updates `aggregateStats` (`Masuk`, `Keluar`, and `Net Terfilter`) so that all transactions are converted to IDR equivalents before summing.
- **Harmonized Transaction Row Display (`/ledger` and `CockpitRecentLedger`)**:
  - Primary nominal amount in both desktop tabular cells and mobile dense rows is formatted in IDR.
  - For non-IDR transactions, the native currency amount (e.g., `10 USDT`) is displayed as contextual secondary metadata beneath the primary IDR value.

## Capabilities

### Modified Capabilities
- `ledger-studio`: Updates `Requirement: Dynamic Filtered Financial Aggregates` and `Requirement: Full-Width Tabular Transaction Ledger` to mandate that all filtered aggregates, timeline anchors, and primary row amounts SHALL be unified into IDR using live/peg conversion rates.

## Impact

- **User Experience**: Completely eliminates confusion where foreign currency transactions barely move the needle or corrupt portfolio projections; user sees their entire financial picture in IDR.
- **Components & Utils**: Updates `src/lib/utils/networth-timeline.ts`, `src/lib/utils/networth-timeline.test.ts`, `src/routes/ledger/+page.svelte`, and `src/lib/components/cockpit/CockpitRecentLedger.svelte`.
- **Breaking Changes**: None. IDR-native transactions continue to behave identically ($1 \times \text{amount}$).
