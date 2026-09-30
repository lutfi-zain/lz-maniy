# Spec Delta: ledger-studio

## ADDED Requirements

### Requirement: Server-Side Filtered Pagination and Keyword Search
The ledger studio SHALL fetch transaction rows on-demand from the server based on current active filter selections, search keywords, and page offset using the backend envelope metadata.

#### Scenario: On-Demand Paged Ledger Query with Keyword
- **WHEN** user views `/ledger` and enters a search keyword (e.g., "Alfamart") or applies wallet, category, type, and date filters
- **THEN** the ledger studio queries `/api/v1/transactions` with the exact active filters, `q=Alfamart`, `envelope=true`, `limit: pageSize`, and `offset: (currentPage - 1) * pageSize`
- **AND** displays the returned rows without loading unrequested historical transactions
- **AND** displays the accurate total row count and total page count directly from `pagination.total` and `pagination.totalPages`.

#### Scenario: Pagination Cursor Availability
- **WHEN** `pagination.hasNext` is true
- **THEN** the pagination controls mark "Berikutnya" (Next) as enabled
- **WHEN** `pagination.hasNext` is false
- **THEN** "Berikutnya" is disabled to signal the end of the query results.

### Requirement: Card-Level Independent Horizon Period Fetching
Each period column in the multi-period Horizon Board SHALL independently fetch and compute its own transactions and metrics.

#### Scenario: Localized Column Query Execution
- **WHEN** the Horizon Board renders multiple period columns (e.g. 12 months)
- **THEN** each column independently requests `/api/v1/transactions?startDate={colStart}&endDate={colEnd}&envelope=true&limit=50` through the concurrency limiter pool
- **AND** displays its own dedicated skeleton loader while its request is in transit
- **AND** renders its transaction list and cashflow metrics immediately upon arrival without waiting for sibling columns.

#### Scenario: Isolated Column Network Error Handling
- **WHEN** an individual period column fails to fetch due to a network interruption
- **THEN** only that specific column renders an error badge with a retry action
- **AND** all other successfully loaded columns remain fully interactive.
