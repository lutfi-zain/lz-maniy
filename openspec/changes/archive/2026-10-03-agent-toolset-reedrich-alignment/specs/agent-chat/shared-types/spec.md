# Spec Delta

## ADDED Requirements

### Requirement: Aligned Parameter and Entity Contracts
The shared types package SHALL define TypeScript interfaces for extended tool parameters and responses matching the Reedrich OpenAPI specification.

#### Scenario: Transaction Mutation Parameter Types
- **WHEN** consumer imports mutation parameter types
- **THEN** `CreateTransactionParams` and `UpdateTransactionParams` support `date` as ISO-8601 string, optional `transactionDate`, `adminFee`, and nullable `budgetId`
- **THEN** `CreateTransferParams` supports `categoryId` and `adminFee`

#### Scenario: Transaction Query Parameter Types
- **WHEN** consumer imports `ListTransactionsParams`
- **THEN** the interface includes optional `q?: string`, `type?: TransactionType`, `isPlanned?: boolean | number`, `budgetId?: string`, `targetWalletId?: string`, and `orderBy?: string`

#### Scenario: Apply Recurring Parameter Types
- **WHEN** consumer imports `ApplyRecurringParams`
- **THEN** the interface includes `templateId: string`, `transactionId?: string`, `executionDate?: string`, and `actualAmount?: number`
