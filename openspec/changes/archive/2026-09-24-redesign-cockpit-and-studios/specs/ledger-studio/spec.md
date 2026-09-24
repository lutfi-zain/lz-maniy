# Spec Delta: ledger-studio

## Purpose
Provides a full-width dedicated transaction ledger studio at `/ledger` featuring super dynamic multi-faceted filtering (date range presets, custom picker, wallet multi-select by bank, category multi-select, transaction types, status, and search), responsive pagination, and real-time aggregate totals.

## ADDED Requirements

### Requirement: Full-Width Tabular Transaction Ledger
The ledger studio SHALL render all user transactions in a full-width, high-density table displaying Date, Description, Category, Source Wallet, Destination Wallet (for transfers), Type, Status (realized/planned), and Amount with tabular numeric alignment.

#### Scenario: View Transaction Rows
- **WHEN** user navigates to `/ledger`
- **THEN** all transactions are rendered in a clean tabular grid with alternating row tints, monospaced tabular numbers, and semantic status indicators.

### Requirement: Super Dynamic Multi-Faceted Filter Engine
The ledger studio SHALL provide comprehensive client-side filtering by Date Range (quick presets: All, Today, This Month, Last Month, Last 3 Months, plus Custom Date Range), Wallet selection grouped by institution, Category selection, Transaction Type (income, expense, transfer), Status (realized vs planned), and Description search text.

#### Scenario: Filter by Date Range Preset
- **WHEN** user selects "This Month" from the date range dropdown
- **THEN** the ledger filters immediately to transactions occurring within the current calendar month and updates the summary counts.

#### Scenario: Filter by Institution and Wallet
- **WHEN** user selects "BCA" from the wallet filter
- **THEN** only transactions belonging to BCA Main or BCA Pocket Sewa Rumah are displayed.

#### Scenario: Real-time Description Search
- **WHEN** user focuses the search input (or presses `/`) and types "KFC"
- **THEN** the ledger updates instantly to show only transactions matching "KFC" in their description or notes.

### Requirement: Dynamic Filtered Financial Aggregates
The ledger studio SHALL dynamically compute and display the sum of income, sum of expenses, and net cashflow for the currently filtered set of transactions.

#### Scenario: Display Filtered Aggregate Bar
- **WHEN** any filter (date, wallet, category, or type) is applied or adjusted
- **THEN** a summary bar above the table displays: matching transaction count, total income (`+Rp X`), total expense (`−Rp Y`), and net delta (`±Rp Z`).
