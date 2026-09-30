# Spec Delta: financial-store

## ADDED Requirements

### Requirement: Server-Driven Parameterized Transaction Querying with Envelopes
The store SHALL query `GET /api/v1/transactions` using structured query parameters and opt-in response envelopes (`?envelope=true`) instead of downloading unconstrained datasets into client memory.

#### Scenario: Query Transactions by Structured Filter and Search Keyword
- **WHEN** `fetchTransactions(params)` is invoked with criteria (e.g. `type: 'expense'`, `walletId: ['w1', 'w2']`, `categoryId: ['c1']`, `status: 'planned'`, `q: 'kopi'`, `startDate`, `endDate`, `limit: 50`, `offset: 0`)
- **THEN** the store constructs a URL query string with comma-separated IDs and query keys (`?walletId=w1,w2&categoryId=c1&type=expense&status=planned&q=kopi&envelope=true&limit=50&offset=0`)
- **AND** dispatches a GET request to `/api/v1/transactions` wrapped in the concurrency pool
- **AND** returns a typed `TransactionEnvelope` containing `{ items, pagination: { total, limit, offset, hasNext, totalPages } }`.

#### Scenario: Support AbortSignal Cancellation
- **WHEN** a subsequent query is initiated before the prior query resolves
- **OR** when the user leaves the current page
- **THEN** the active request is aborted via `AbortController` without throwing unhandled exceptions.

### Requirement: Multi-Period Horizon Projections Engine Integration
The store SHALL query `GET /api/v1/analytics/horizon` to retrieve forward-looking multi-period projections computed natively at the edge.

#### Scenario: Fetch Horizon Board Projections
- **WHEN** `fetchHorizonProjections(periods)` is called with an array of calendar months (e.g., `['2026-09', '2026-10', '2026-11']`)
- **THEN** the store dispatches a request to `/api/v1/analytics/horizon?periods=2026-09,2026-10,2026-11`
- **AND** returns the structured `HorizonBoard` DTO with precomputed cashflow, roll-forward wallet balances, spendable/locked trajectories, and goal milestone achievements.

### Requirement: Request Concurrency Pool and Connection Limiting
The application SHALL limit simultaneous in-flight HTTP requests to the Reedrich API to a maximum of 10 concurrent connections.

#### Scenario: Queue Requests Exceeding Concurrency Limit
- **WHEN** 15 requests are dispatched simultaneously (e.g., 15 period cards on a Horizon Board)
- **THEN** the first 10 requests execute immediately
- **AND** the remaining 5 requests are queued in FIFO order
- **AND** as each active request completes, the next queued request is dequeued and executed without starving.

### Requirement: Temporal Snapshot Querying with Date Bounds
The store SHALL pass `startDate` and `endDate` query parameters when querying `GET /api/v1/account-detail` and `GET /api/v1/summary`.

#### Scenario: Synchronize Account Detail Snapshot with Date Range
- **WHEN** user selects a timeframe in `dateFilterStore` (e.g., `2026-09-01` to `2026-09-30`)
- **THEN** `fetchSnapshot()` appends `startDate` and `endDate` to `/api/v1/account-detail`
- **AND** the backend delivers cashflow, balances, and allocations scoped to that period.
