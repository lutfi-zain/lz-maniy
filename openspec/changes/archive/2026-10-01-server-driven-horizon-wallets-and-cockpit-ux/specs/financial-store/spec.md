# Spec Delta: financial-store

## ADDED Requirements

### Requirement: Server-Driven Wallet Queries with Point-in-Time Parameters
The financial store MUST support parameterized queries for user wallets through `fetchWallets({ startDate, endDate, filter })` targeting `GET /api/v1/wallets`.

#### Scenario: Querying wallets with date bounds
- **WHEN** `fetchWallets` is called with `startDate` and `endDate` options
- **THEN** the request to `GET /api/v1/wallets` MUST append `startDate=${startDate}&endDate=${endDate}`
- **AND** the returned wallet array MUST populate `reedrichStore.allWallets`.

### Requirement: Transaction Query Parameters with Sorting & Direction
The financial store query builder MUST support `orderBy` and `direction` query parameters for `GET /api/v1/transactions`.

#### Scenario: Cockpit requests recent transactions with sorting
- **WHEN** `fetchTransactions` is called with `orderBy: 'date'`, `direction: 'desc'`, and `status: 'realized'`
- **THEN** the request URL MUST contain `orderBy=date`, `direction=desc`, and `status=realized`.
