# Spec Delta: financial-store

## ADDED Requirements

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
