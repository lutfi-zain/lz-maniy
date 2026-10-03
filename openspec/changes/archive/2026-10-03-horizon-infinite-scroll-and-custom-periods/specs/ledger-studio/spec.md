# Spec Delta

## ADDED Requirements

### Requirement: Horizon Column Automatic Infinite Scroll
The Ledger Horizon Board period column SHALL automatically fetch and append the next page of transactions as the user scrolls near the bottom of the column's transaction container, replacing manual click-to-paginate controls.

#### Scenario: User Scrolls Near Bottom of Transaction List
- **WHEN** user scrolls down a horizon period column and the bottom sentinel enters the scrollport
- **AND** `hasNext` is true and a query is not already in flight
- **THEN** the column automatically dispatches a query for the next page of transactions with `offset = periodTransactions.length`
- **AND** newly fetched transactions are seamlessly appended to the list without resetting scroll position.

#### Scenario: Sentinel Indicates Loading State
- **WHEN** the next page query is in flight
- **THEN** the bottom sentinel renders a subtle loading indicator
- **AND** once `hasNext` becomes false, the sentinel is removed and an end-of-list indicator or spacing is rendered.

### Requirement: Immutable Server-Anchored Horizon Cashflow
The Ledger Horizon Board `PeriodSummaryCard` SHALL source all period cashflow metrics (`income`, `expense`, `net`) directly and immutably from the server-computed horizon projection (`srvPeriod.cashflow`).

#### Scenario: Cashflow Remains Invariant During Scroll
- **WHEN** user views a horizon period column with 80 total transactions where only 50 are initially loaded
- **THEN** the summary card displays the complete 80-transaction cashflow totals from the server
- **AND** scrolling down to auto-fetch the remaining 30 transactions does NOT alter or recalculate the summary card cashflow values.

### Requirement: Custom Date Range Horizon Periods
The Ledger Horizon Board SHALL support adding, displaying, and navigating arbitrary date intervals (e.g. `2026-09-25` to `2026-10-24`) alongside canonical calendar months (`YYYY-MM`).

#### Scenario: Add Custom Date Interval via Period Card
- **WHEN** user opens `AddPeriodCard` and selects a custom start date and end date
- **THEN** a new period key formatted as `YYYY-MM-DD_YYYY-MM-DD` is appended to active periods
- **AND** a new horizon column renders covering that specific date interval.

#### Scenario: Custom Interval Header Formatting
- **WHEN** a horizon column represents a custom date interval (e.g., `2026-09-25_2026-10-24`)
- **THEN** the column header renders a formatted localized date range (e.g. `25 Sep – 24 Okt 2026`) instead of a single month title.

#### Scenario: Maximize Custom Interval to List View
- **WHEN** user clicks the Maximize button on a custom date interval column
- **THEN** the global date filter is updated to `preset: 'custom'` with the column's exact `startDate` and `endDate`
- **AND** the ledger transitions to List view showing that custom interval.
