# Spec Delta: ledger-studio

## ADDED Requirements

### Requirement: Budget Multi-Select Filtering and URL Linking

The ledger studio SHALL provide transaction filtering by budget using a searchable multi-select combobox and support inbound URL navigation with `budgetId` and `budget` query parameters.

#### Scenario: Filter Ledger by Selected Budget
- **WHEN** user selects a budget (e.g. "Jenguk Rumah" or "Belanja Bulanan") from the budget combobox
- **THEN** the ledger filters the transaction feed to only rows whose `transactionBudgetId` matches the selected budget ID
- **THEN** aggregate summary stats and pagination recompute for the matching budget transactions

#### Scenario: Inbound Navigation with Budget Query Parameters
- **WHEN** user navigates to `/ledger?budgetId=budget-123&budget=Jenguk%20Rumah`
- **THEN** the ledger parses `budgetId` from URL parameters and sets the active budget filter
- **THEN** the filter bar renders an active budget chip displaying the budget name with a one-click "x" clear action

---

### Requirement: Budget Tag Display in Transaction Rows

The ledger studio SHALL display the resolved budget badge alongside the category on transaction rows when a transaction is assigned to a budget.

#### Scenario: Transaction with Assigned Budget
- **WHEN** a transaction has a non-null `transactionBudgetId`
- **THEN** both desktop table row and mobile feed item display the resolved budget name as a distinct subtle tag
