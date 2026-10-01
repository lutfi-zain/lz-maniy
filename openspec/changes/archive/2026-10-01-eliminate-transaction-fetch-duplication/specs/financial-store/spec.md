# Spec Delta: financial-store

## ADDED Requirements

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
