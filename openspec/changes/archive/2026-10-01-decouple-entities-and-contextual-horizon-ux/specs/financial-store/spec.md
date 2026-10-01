# Spec Delta: financial-store

## ADDED Requirements

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
