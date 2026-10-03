# Spec Delta

## ADDED Requirements

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
