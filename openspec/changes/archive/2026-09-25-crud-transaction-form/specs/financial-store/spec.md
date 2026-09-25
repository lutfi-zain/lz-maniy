# financial-store Spec Delta

## ADDED Requirements

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
