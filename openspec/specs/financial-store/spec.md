# financial-store Specification

## Purpose
Manages reactive frontend state using Svelte 5 runes ($state, $derived), providing normalized caching for Reedrich API endpoints, resilient offline fallback, multi-currency formatting, and on-demand transaction retrieval.

## Requirements

### Requirement: Unified Account Detail Synchronization
The store SHALL fetch and normalize the atomic financial snapshot from `GET /api/v1/account-detail` into typed reactive state structures.

#### Scenario: Successful Live Snapshot Load
- **WHEN** a valid API key or Bearer token is provided and the network is online
- **THEN** the store populates netWorth, spendable/locked wallets, monthly cashflow, budgets, goals, and obligations from the live API response.

#### Scenario: Offline Mock Fallback
- **WHEN** network requests fail or the user toggles mock mode
- **THEN** the store loads the bundled mock snapshot, sets connection status to `MOCK / OFFLINE`, and prevents unhandled promise rejections.

### Requirement: Multi-Currency & Locale Formatting
The store SHALL provide deterministic formatting utilities for IDR (Indonesian Rupiah) and foreign currencies (e.g., USDT).

#### Scenario: Format Indonesian Rupiah
- **WHEN** formatting an IDR amount such as `12500000`
- **THEN** the output string is `Rp 12.500.000`.

#### Scenario: Format USDT Cryptocurrency
- **WHEN** formatting a USDT balance such as `115.61`
- **THEN** the output string is `115,61 USDT`.

### Requirement: On-Demand Entity Transaction Querying
The store SHALL provide a method to query transactions filtered by `walletId`, `categoryId`, or `budgetId`, caching results per entity to avoid redundant network round-trips.

#### Scenario: Query Transactions by Wallet ID
- **WHEN** `fetchWalletTransactions(walletId)` is invoked
- **THEN** transactions matching that wallet ID are fetched, cached in memory, and delivered to the calling component.

### Requirement: Transaction Mutation Methods
The store SHALL provide methods to create, update, and delete transactions via the Reedrich API, using the existing authenticated `request()` pipeline.

#### Scenario: Create Expense or Income Transaction
- **WHEN** `createTransaction()` is called with valid fields (`walletId`, `categoryId`, `amount`, `type`, `date`)
- **THEN** a `POST /api/v1/transactions` request is sent with the provided payload
- **THEN** on success, the transaction cache is invalidated and snapshot is refreshed

#### Scenario: Create Transfer
- **WHEN** `createTransfer()` is called with valid fields (`sourceWalletId`, `targetWalletId`, `amount`)
- **THEN** a `POST /api/v1/transfers` request is sent
- **THEN** on success, the transaction cache is invalidated and snapshot is refreshed

#### Scenario: Update Transaction
- **WHEN** `updateTransaction(transactionId, fields)` is called
- **THEN** a `PATCH /api/v1/transactions/{transactionId}` request is sent with the delta fields
- **THEN** on success, the transaction cache is invalidated and snapshot is refreshed

#### Scenario: Delete Transaction
- **WHEN** `deleteTransaction(transactionId)` is called
- **THEN** a `DELETE /api/v1/transactions/{transactionId}` request is sent
- **THEN** on success, the transaction is removed from local state, the transaction cache is invalidated, and snapshot is refreshed

#### Scenario: Mutation Failure
- **WHEN** any mutation API call returns an error response
- **THEN** the method throws an error with the API error message, does not modify local state, and does not trigger snapshot refresh

### Requirement: Standalone Entity Detail Fetchers
The store SHALL provide granular methods to fetch individual entity records by ID from the Reedrich API without requiring a full account snapshot refresh.

#### Scenario: Fetch Goal by ID
- **WHEN** `fetchGoalById(goalId)` is invoked
- **THEN** the store dispatches `GET /api/v1/goals/{goalId}`
- **AND** returns the complete `Goal` DTO containing `notes`, `targetDate`, `status`, and `pacing` metrics (`requiredDailySavings`, `requiredMonthlySavings`, `daysRemaining`).

#### Scenario: Fetch Budget by ID
- **WHEN** `fetchBudgetById(budgetId)` is invoked
- **THEN** the store dispatches `GET /api/v1/budgets/{budgetId}`
- **AND** returns the complete `Budget` DTO with dynamic `spent`, `remaining`, `percentUsed`, and exact `periodStart`/`periodEnd`.

#### Scenario: Fetch Wallet by ID
- **WHEN** `fetchWalletById(walletId)` is invoked
- **THEN** the store dispatches `GET /api/v1/wallets/{walletId}`
- **AND** returns the complete `Wallet` DTO including its `lastTransaction` record.

#### Scenario: Fetch Transaction by ID
- **WHEN** `fetchTransactionById(transactionId)` is invoked
- **THEN** the store dispatches `GET /api/v1/transactions/{transactionId}`
- **AND** returns the complete `Transaction` DTO including `transactionOccurrenceDate`, `transactionRealizedAt`, `transactionPlannedAmount`, and `transactionTemplateId`.

### Requirement: Standalone Entity List Fetchers
The store SHALL provide dedicated methods to fetch entity arrays directly from their primary endpoints.

#### Scenario: Standalone Fetch Goals with Optional Status Filter
- **WHEN** `fetchGoals(status?: 'in_progress' | 'completed' | 'cancelled')` is called
- **THEN** a `GET /api/v1/goals` request is sent with the optional status query parameter
- **AND** the local `activeGoals` state is updated with the returned array.

#### Scenario: Standalone Fetch Budgets
- **WHEN** `fetchBudgets()` is called
- **THEN** a `GET /api/v1/budgets` request is sent
- **AND** the local `activeBudgets` state is updated with the returned array.

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

The store SHALL pass `startDate` and `endDate` when querying supported date-bounded account reports. The account overview SHALL preserve the current Reedrich contract: its realized cashflow is selected-period data, its budget collection intersects the selected period, and its net worth, wallet capital, and linked-goal capital are live values. Historical wallet capital SHALL be obtained from point-in-time wallet snapshots rather than inferred from the live account overview. Calendar-period queries SHALL include their intended first and final instants without double-counting adjacent periods.

#### Scenario: Synchronize Account Detail Snapshot with Date Range
- **WHEN** the user selects a timeframe such as September 1 through September 30
- **THEN** the account-detail request includes date bounds that cover the intended calendar period
- **AND** the store consumes realized cashflow for that period and the overlapping budget collection
- **AND** live net worth, wallet capital, and linked-goal amounts are not falsely presented as reconstructed historical closing balances.

#### Scenario: Historical Wallet Capital Uses Point-in-Time Snapshot
- **WHEN** a historical wallet or account view needs its selected period's opening, movement, or closing balance
- **THEN** it uses the date-bounded wallet snapshot fields for that period
- **AND** it does not substitute a live `walletBalance` or live account-overview total for the requested historical value.

#### Scenario: Calendar Boundary Values Are Not Lost
- **WHEN** a selected calendar period contains transactions at its first and final valid UTC instants
- **THEN** both are included in the intended period report
- **AND** a transaction at the following period's first instant is excluded.

### Requirement: Single-Pipeline Transaction Reads
Every transaction read path in the application SHALL route through the parameterized envelope query pipeline with concurrency-pool gating and abort support. No component SHALL issue raw `fetch()` calls to `/api/v1/transactions`.

#### Scenario: Cockpit Feed Uses Envelope Pipeline
- **WHEN** the cockpit recent-transactions feed loads for a date range
- **THEN** exactly one request is dispatched to `/api/v1/transactions` with `envelope=true`, `startDate`, `endDate`, and `limit`
- **AND** the request flows through the concurrency pool honoring the 10-connection limit.

#### Scenario: Drawer Queries Use Envelope Contract
- **WHEN** any drawer requests transactions scoped by wallet, category, or budget
- **THEN** the request includes `envelope=true`
- **AND** the response is consumed as a `TransactionEnvelope` (`items` plus `pagination` metadata).

#### Scenario: Legacy Full-History Download Retired
- **WHEN** any page mounts (`/`, `/accounts`, `/planning`, `/planning#categories`) or the app shell initializes
- **THEN** no unconstrained full-history transaction download is triggered.

#### Scenario: Post-Mutation Invalidation Excludes Full History Loop
- **WHEN** a transaction mutation (create, update, delete, transfer) succeeds
- **THEN** `invalidateAndRefresh()` refreshes the snapshot and recurring templates without triggering an unconstrained `while (true)` transaction download.

### Requirement: Standalone Wallet and Obligations List Fetchers
The store SHALL provide dedicated methods to fetch wallet and debt/loan entity arrays directly from their primary REST endpoints (`GET /api/v1/wallets` and `GET /api/v1/debts-loans`).

#### Scenario: Standalone Fetch Wallets
- **WHEN** `fetchWallets()` is called
- **THEN** a `GET /api/v1/wallets` request is dispatched through the concurrency pool
- **AND** the returned wallet array is mapped to `WalletItem` objects containing real `lastTransaction` metadata
- **AND** the local `activeWallets` state is updated with the returned array.

#### Scenario: Standalone Fetch Debts and Loans
- **WHEN** `fetchDebtsLoans()` is called
- **THEN** a `GET /api/v1/debts-loans` request is dispatched through the concurrency pool
- **AND** the local `activeDebts` and `activeLoans` states are updated with the returned records.

### Requirement: Server-Driven Wallet Queries with Point-in-Time Parameters
The financial store MUST support parameterized queries for user wallets through `fetchWallets({ startDate, endDate, filter })` targeting `GET /api/v1/wallets`. When the backend returns point-in-time calculation payloads (`snapshot`), the store MUST map the wallet's `balance` to `snapshot.totalBalance` (including realized and planned transactions up to the specified boundary) before falling back to the current live `walletBalance`.

#### Scenario: Querying wallets with date bounds
- **WHEN** `fetchWallets` is called with `startDate` and `endDate` options
- **THEN** the request to `GET /api/v1/wallets` MUST append `startDate=${startDate}&endDate=${endDate}`
- **AND** for each returned wallet having a `snapshot.totalBalance`, the resulting `WalletItem.balance` MUST be assigned to that `snapshot.totalBalance`
- **AND** the returned wallet array MUST populate `reedrichStore.activeWallets` and `reedrichStore.allWallets`.

#### Scenario: Querying wallets without date bounds preserves live balance
- **WHEN** `fetchWallets()` is called with no temporal query parameters
- **THEN** `WalletItem.balance` MUST default to `w.walletBalance` or `w.balance`
- **AND** the store reflects current live operational balances.

#### Scenario: Querying wallets with future planned periods
- **WHEN** `fetchWallets` is called with date bounds in a future horizon (e.g. Next Month)
- **THEN** the extracted `WalletItem.balance` reflects the projected closing balance incorporating planned income and expenses returned in `snapshot.totalBalance`.

### Requirement: Transaction Query Parameters with Sorting & Direction
The financial store query builder MUST support `orderBy` and `direction` query parameters for `GET /api/v1/transactions`.

#### Scenario: Cockpit requests recent transactions with sorting
- **WHEN** `fetchTransactions` is called with `orderBy: 'date'`, `direction: 'desc'`, and `status: 'realized'`
- **THEN** the request URL MUST contain `orderBy=date`, `direction=desc`, and `status=realized`.

### Requirement: Snapshot Budget Preservation on Standalone Fetch
The financial store MUST preserve the temporally-filtered `snapshot.budgets` array when standalone budget queries (`fetchBudgets()`) are executed for historical management views.

#### Scenario: Standalone budgets fetch does not pollute active snapshot
- **WHEN** `reedrichStore.fetchBudgets()` is invoked to populate `/planning`
- **THEN** the returned collection MUST update `allBudgets` without overwriting `this.snapshot.budgets`
- **AND** returning to the Cockpit dashboard MUST continue displaying only the temporally-filtered budgets from `snapshot.budgets`.

### Requirement: Deprecation of Full-History Transaction State
The financial store SHALL NOT maintain a client-side full-history transaction array (`allTransactions`). Components requiring projected or historical wallet balances SHALL use server-computed endpoints.

#### Scenario: No Component Reads allTransactions
- **WHEN** any page or component mounts
- **THEN** no reactive derivation or function call reads `reedrichStore.allTransactions` for financial calculations
- **AND** the `allTransactions` field and `isLedgerLoading` flag are removed from the store.

#### Scenario: Post-Deprecation Store Shape
- **WHEN** the `allTransactions` field is removed
- **THEN** `invalidateAndRefresh()` no longer resets it
- **AND** logout/reset no longer references it
- **AND** no import of `calculatePointInTimeNetWorth` or `calculatePointInTimeWalletBalances` remains in route pages or horizon board components.

### Requirement: Arbitrary Date Interval Horizon Projections Querying
The financial store SHALL support querying forward-looking multi-period projections for arbitrary start and end date intervals in addition to whole calendar months.

#### Scenario: Query Horizon Projections with Custom Date Intervals
- **WHEN** `fetchHorizonProjections(periods)` is called with an array containing date intervals (e.g., `['2026-09-25_2026-10-24', '2026-10-25_2026-11-24']` or `[['2026-09-25', '2026-10-24']]`)
- **THEN** the store serializes the intervals into a 2D JSON array query parameter `periods=[["2026-09-25","2026-10-24"],...]`
- **AND** dispatches the request to `GET /api/v1/analytics/horizon`
- **AND** returns the typed `HorizonBoardDTO` with periods indexed by their interval keys.

### Requirement: Global Sync Refetches Active Page
The Topbar Sync control SHALL refetch the data query of the currently active page (route + date filter) with cache clearing, instead of only reloading the global snapshot. Sync SHALL provide visible feedback while in flight and record the last-sync outcome.

#### Scenario: Sync refetches the active ledger query
- **GIVEN** the user is on `/ledger` with an active date filter and transaction filters
- **WHEN** the user activates Sync
- **THEN** the active transaction query MUST be re-executed against the server with the current filters
- **THEN** the transaction table MUST reflect fresh server data

#### Scenario: Sync refetches the active accounts query
- **GIVEN** the user is on `/accounts` with an active date range
- **WHEN** the user activates Sync
- **THEN** the wallet list query MUST be re-executed with the current date range

#### Scenario: Sync refetches the active planning queries
- **GIVEN** the user is on `/planning` with an active sub-tab
- **WHEN** the user activates Sync
- **THEN** the entity queries for the active sub-tab (budgets, goals, or obligations) MUST be re-executed

#### Scenario: Sync clears stale caches before refetching
- **GIVEN** cached transaction or entity data exists
- **WHEN** the user activates Sync
- **THEN** relevant caches MUST be cleared before the refetch so no stale rows survive

#### Scenario: Sync shows in-flight and completed states
- **WHEN** Sync is in flight
- **THEN** the Sync control MUST show a loading indicator and be disabled
- **WHEN** Sync completes
- **THEN** the last-sync outcome MUST be observable (timestamp or status), distinct from "nothing happened"

### Requirement: Post-Mutation Refresh Covers All Collections
After every successful create, update, or delete mutation, the store SHALL refresh all entity collections affected by financial state (snapshot, wallets, recurring templates, budgets, goals, debts/loans) with cache clearing, so no workbench displays stale data without requiring tab navigation.

#### Scenario: Budget mutation refreshes budget list without tab switch
- **GIVEN** the user edits a budget while on the Planning Budgets tab
- **WHEN** the mutation succeeds
- **THEN** the budget list MUST reflect the updated values without requiring tab navigation

#### Scenario: Goal mutation refreshes goal list without tab switch
- **GIVEN** the user edits a goal while on the Planning Goals tab
- **WHEN** the mutation succeeds
- **THEN** the goal list MUST reflect the updated values without requiring tab navigation

#### Scenario: Obligation data refreshes after related mutations
- **GIVEN** a mutation affecting debts, loans, or recurring templates succeeds
- **WHEN** the refresh completes
- **THEN** the obligations workbench MUST reflect current server state
