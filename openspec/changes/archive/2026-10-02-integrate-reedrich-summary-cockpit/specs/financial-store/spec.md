# Spec Delta: financial-store

## ADDED Requirements

### Requirement: Financial Summary & Mutation Lifecycle Operations
The store SHALL synchronize consolidated financial summaries and provide mutation methods for debt repayment and recurring template application via authenticated Reedrich REST API endpoints.

#### Scenario: Fetch Consolidated Financial Summary
- **WHEN** `fetchSummary(dates, baseCurrency)` is invoked with an authenticated session
- **THEN** the store sends `GET /api/v1/summary` and stores the resulting `FinancialSummary` structure in reactive `summary` state
- **THEN** if offline or the API request fails, the store falls back gracefully to a calculated mock summary without breaking the UI

#### Scenario: Settle Debt or Loan with Wallet Deduction
- **WHEN** `repayDebtLoan(debtLoanId, payload)` is invoked with `{ amount, walletId, adjustWalletBalance }`
- **THEN** a `POST /api/v1/debts-loans/{debtLoanId}/repay` request is dispatched
- **THEN** on success, the debt record is updated, the source wallet balance is recalculated, and both summary and snapshot caches are refreshed

#### Scenario: Apply Planned Recurring Template Occurrence
- **WHEN** `applyRecurringTemplate(templateId, payload)` is invoked with `{ transactionId, executionDate, actualAmount }`
- **THEN** a `POST /api/v1/recurring-templates/{templateId}/apply` request is dispatched
- **THEN** on success, the planned occurrence is materialized into a realized transaction, wallet balances are adjusted, and active feeds are refreshed
