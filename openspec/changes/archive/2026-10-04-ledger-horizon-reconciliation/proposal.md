## Why

Users observing `/ledger` for the current month (e.g. October 2026) encounter confusing discrepancies between the List View summary strip and the Horizon Board. First, `HorizonBoard.svelte` labels the current month's server-projected month-end closing balance as `"NET WORTH SAAT INI"` even though it incorporates all planned transactions through month-end, creating an apparent conflict with the List View's live snapshot balance today. Second, the List View cashflow KPI strip calculates income, expense, and net figures strictly from the paginated transaction array (`serverTransactions`, limited to 50 items), omitting transactions on page 2 and beyond and producing mismatched cashflow totals compared to the full-month Horizon Board projection.

## What Changes

- **Accurate Horizon Board Labeling for Present Month**: Update `HorizonBoard.svelte` and `PeriodSummaryCard.svelte` so that when `periodKey === currYearMonth`, the net worth metric is explicitly labeled `"PROYEKSI AKHIR BULAN"` (`Closing Month-End Projection`) instead of `"NET WORTH SAAT INI"`, eliminating the false equivalence with today's live account balance.
- **Full-Period Cashflow Aggregation in List View**: Enhance `routes/ledger/+page.svelte` so that when viewing an unfiltered calendar month (or when `serverTotalCount > serverTransactions.length`), the cashflow totals (Masuk, Keluar, Net Terfilter) align with the authoritative full-period cashflow from server projections (`horizonAnchorData` or full date range aggregate) rather than truncating at the 50-item page 1 boundary.
- **Clear Temporal Disambiguation**: Provide unambiguous subtext explaining that the right-zone anchor reflects live realized wealth today, while future/current month-end projections reflect expected closing balances after all planned cashflow.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `ledger-studio`: Update the Dual-Layer Live Summary Strip and Server-Driven Horizon Board Projections requirements to specify accurate month-end labeling and full-period cashflow aggregation integrity.

## Impact

- **Affected Files**:
  - `apps/web/src/routes/ledger/+page.svelte`: Cashflow aggregation logic and anchor label handling.
  - `apps/web/src/lib/components/ledger/HorizonBoard.svelte`: Current month projection label resolution.
  - `apps/web/src/lib/components/ledger/PeriodSummaryCard.svelte`: Adaptive label presentation.
  - `apps/web/src/lib/i18n/locales/{en,id}.ts`: Translation keys for month-end closing projection (`PROYEKSI AKHIR BULAN` / `Month-End Projection`).
- **Breaking Changes**: None. Backwards compatible with existing routes.
