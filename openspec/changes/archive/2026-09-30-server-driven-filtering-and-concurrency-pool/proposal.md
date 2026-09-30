# Proposal: Server-Driven Filtering, Horizon Projections Engine, and Request Concurrency Pool

## Why

The current frontend implementation of `reedrichStore.fetchAllTransactions()` downloads the entire transaction database into client memory via an unconstrained `while (true)` pagination loop with `limit=200`, followed by in-memory JavaScript array `.filter()` operations on every ledger view, horizon board column, and drawer interaction. This anti-pattern wastes network bandwidth, creates high client memory overhead, and causes severe rendering bottlenecks as transaction history grows.

Reedrich API v1.13.0 introduces a modern Edge query engine featuring:
1. **Universal Pagination & Structured Envelopes**: `GET /api/v1/transactions?envelope=true` delivering `{ items, pagination: { total, limit, offset, hasNext, totalPages } }` and universal response headers (`X-Total-Count`, `X-Limit`, `X-Offset`, `X-Has-Next-Page`).
2. **Server-Side Case-Insensitive Keyword Search**: `?q=` filtering transaction descriptions via SQL `LOWER(description) LIKE '%q%'`.
3. **Multi-Value ID Filtering**: Comma-separated query parameters (`?walletId=w1,w2`, `?categoryId=c1,c2`, `?budgetId=b1,b2`) matching multi-select UI comboboxes natively in SQL.
4. **Status Aliases**: Clean status filters (`status=realized|planned|all`).
5. **Multi-Period Horizon Projections Engine**: `GET /api/v1/analytics/horizon` delivering atomic roll-forward point-in-time wallet balances, spendable vs locked trajectories, cashflow metrics, and savings goal milestones in a single edge pass.

Adopting these v1.13.0 capabilities alongside card-level period fetching and a client-side request concurrency limiter (maximum 10 simultaneous connections) establishes an enterprise-grade, high-performance, and resilient architecture.

## What Changes

- **Server-Driven Querying on `/api/v1/transactions`**:
  - Replace monolithic `fetchAllTransactions()` loop with parameterized query fetching: `fetchTransactions(params: TransactionQueryParams)`.
  - Pass structured query parameters directly to the server: `walletId` (comma-separated), `categoryId` (comma-separated), `budgetId` (comma-separated), `type`, `status` (`realized|planned|all`), `q` (keyword search), `startDate`, `endDate`, `limit`, `offset`, and `envelope=true`.
  - Update `/ledger` list view to request only the active page (`limit`, `offset`) matching the current filter state in `ledgerFilterStore`, displaying total records and pages directly from `pagination.total` and `pagination.totalPages`.
- **Backend Horizon Projections Integration**:
  - Integrate `GET /api/v1/analytics/horizon` into `reedrichStore.fetchHorizonProjections(periods?: string[], months?: number)` to power the macro timelines and forward-looking balances across `/accounts` and `/planning`.
- **Card-Level Horizon Board Fetching**:
  - Refactor `HorizonPeriodColumn.svelte` so each transaction column independently queries `/api/v1/transactions?startDate=..&endDate=..&envelope=true` for its own timeframe.
  - Calculate period metrics (cashflow in/out/net and transaction list) strictly from that card's localized data rather than slicing a global array.
  - Implement granular skeleton loading and error retry states per individual card/column.
- **Backend Concurrency Limiter (Max 10 Simultaneous Connections)**:
  - Implement a request concurrency pool (`ConcurrencyPool` / Semaphore) that queues outgoing fetch requests and guarantees no more than 10 simultaneous HTTP requests hit the Reedrich backend at any single moment.
  - Support `AbortController` cancellation so navigating away or mutating filter parameters immediately cancels in-flight or queued requests.

## Capabilities

### New Capabilities
None. All changes enhance existing financial store, query pipelines, and ledger/horizon board presentation surfaces.

### Modified Capabilities
- `financial-store`: Update requirements to specify parameterized transaction querying with envelope metadata (`fetchTransactions`), integration of `GET /api/v1/analytics/horizon`, and a 10-connection concurrency limiter pool.
- `ledger-studio`: Update requirements to specify server-side filtered pagination, server-side keyword search (`?q=`), multi-select filter parameters, and per-card independent data loading with granular skeleton indicators.

## Impact

- **Codebase**:
  - `apps/web/src/lib/utils/concurrency-pool.ts` (new concurrency pool & queue utility)
  - `apps/web/src/lib/stores/reedrich.svelte.ts` (parameterized queries, envelope parsing, horizon analytics integration, deprecate while-loop `fetchAllTransactions`)
  - `apps/web/src/lib/types/account-detail.ts` (add `TransactionEnvelope`, `PaginationMetadata`, `HorizonBoard` DTO interfaces)
  - `apps/web/src/routes/ledger/+page.svelte` (server-side query and pagination integration)
  - `apps/web/src/lib/components/ledger/HorizonPeriodColumn.svelte` (per-card localized fetch via concurrency pool)
  - `apps/web/src/lib/components/accounts/AccountsHorizonBoard.svelte` (integrate server horizon analytics projections)
  - `apps/web/src/lib/components/goals/GoalsHorizonBoard.svelte` (integrate server horizon analytics projections)
- **Breaking Changes**: None. The Reedrich API v1.13.0 retains 100% backward compatibility.
