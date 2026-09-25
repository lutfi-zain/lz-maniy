# Spec Delta: planning-studio

## ADDED Requirements

### Requirement: Outbound Drilldown Links from Planning Entities to Filtered Ledger

The planning studio SHALL provide direct, interactive navigation links on budget cards, goal wallets, and recurring template rows that redirect users to pre-filtered ledger views.

#### Scenario: Budget Card Transaction Drilldown
- **WHEN** user clicks "Lihat Transaksi →" on a budget card (e.g. "Jenguk Rumah")
- **THEN** browser navigates to `/ledger` with `budgetId` and URL-encoded `budget` parameters
- **THEN** the target ledger view displays only transactions belonging to that specific budget

#### Scenario: Savings Goal Linked Wallet Drilldown
- **WHEN** user clicks a linked funding wallet on a savings goal card
- **THEN** browser navigates to `/ledger` with `walletId` pre-filtered to inspect transactions in that wallet

#### Scenario: Recurring Template / Liability Drilldown
- **WHEN** user clicks "Mutasi Terkait →" on a recurring template or obligation row
- **THEN** browser navigates to `/ledger` with a search keyword pre-filtered to locate realized transactions matching that recurring pattern
