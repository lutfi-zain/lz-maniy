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
The store SHALL pass `startDate` and `endDate` query parameters when querying `GET /api/v1/account-detail` and `GET /api/v1/summary`.

#### Scenario: Synchronize Account Detail Snapshot with Date Range
- **WHEN** user selects a timeframe in `dateFilterStore` (e.g., `2026-09-01` to `2026-09-30`)
- **THEN** `fetchSnapshot()` appends `startDate` and `endDate` to `/api/v1/account-detail`
- **AND** the backend delivers cashflow, balances, and allocations scoped to that period.

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
