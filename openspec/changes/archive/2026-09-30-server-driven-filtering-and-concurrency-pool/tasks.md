# Tasks

## 1. Concurrency Pool & Query Utilities

- [x] 1.1 Create `apps/web/src/lib/utils/concurrency-pool.ts` implementing the `ConcurrencyPool` class with maximum 10 simultaneous connection capacity, FIFO queuing, and `AbortSignal` cancellation support.
- [x] 1.2 Create unit tests in `apps/web/src/lib/utils/concurrency-pool.test.ts` verifying max 10 concurrent executions, FIFO queueing order, and task abort behaviors.

## 2. Store Layer Parameterization & v1.13.0 DTO Contracts

- [x] 2.1 Add `PaginationMetadata`, `TransactionEnvelope`, `HorizonPeriodSummary`, and `HorizonBoardDTO` interfaces to `apps/web/src/lib/types/account-detail.ts`.
- [x] 2.2 Add `fetchTransactions(params: TransactionQueryParams): Promise<TransactionEnvelope>` to `apps/web/src/lib/stores/reedrich.svelte.ts` wrapping requests in `concurrencyPool` and passing comma-separated multi-filters, `q`, `status`, `startDate`, `endDate`, and `envelope=true`.
- [x] 2.3 Add `fetchHorizonProjections(periods?: string[], months?: number): Promise<HorizonBoardDTO>` to `apps/web/src/lib/stores/reedrich.svelte.ts` querying `GET /api/v1/analytics/horizon`.
- [x] 2.4 Update `fetchSnapshot()` in `apps/web/src/lib/stores/reedrich.svelte.ts` to pass `startDate` and `endDate` query parameters to `/api/v1/account-detail`.
- [x] 2.5 Add unit tests in `apps/web/src/lib/stores/reedrich.test.ts` verifying parameterized query string construction, envelope handling, and concurrency execution.

## 3. Ledger Studio Server-Side Filtered Pagination & Search

- [x] 3.1 Refactor `apps/web/src/routes/ledger/+page.svelte` to query `reedrichStore.fetchTransactions(...)` dynamically when filters, date range, search query (`q`), or page changes, rather than filtering a monolithic array.
- [x] 3.2 Update ledger pagination in `apps/web/src/routes/ledger/+page.svelte` to use `pagination.total`, `pagination.totalPages`, and `pagination.hasNext` directly from the server envelope.

## 4. Horizon Board Card-Level Localized Fetching

- [x] 4.1 Refactor `apps/web/src/lib/components/ledger/HorizonPeriodColumn.svelte` to independently fetch transactions for its specific monthly window (`startDate` to `endDate`) through `concurrencyPool`, with localized cashflow calculations and card-level skeleton loading states.
- [x] 4.2 Refactor `apps/web/src/lib/components/accounts/AccountsHorizonBoard.svelte` to integrate `fetchHorizonProjections` for edge-computed roll-forward wallet balances with granular skeleton indicators.
- [x] 4.3 Refactor `apps/web/src/lib/components/goals/GoalsHorizonBoard.svelte` to integrate `fetchHorizonProjections` for edge-computed goal milestones and pacing with granular skeleton indicators.

## 5. Testing & Validation

- [x] 5.1 Run unit test suite: `bun run --cwd apps/web test:unit`.
- [x] 5.2 Run typecheck and lint: `bun run check:web` and `bun run lint:web`.
- [x] 5.3 Create and run Playwright E2E test `apps/web/tests/server-driven-fetching.spec.ts` verifying server-driven ledger filtering, pagination, card-level horizon board loading, and concurrency limits under parallel execution.
