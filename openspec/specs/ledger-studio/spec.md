# ledger-studio Specification

## Purpose
Provides a full-width dedicated transaction ledger studio at `/ledger` featuring super dynamic multi-faceted filtering (date range presets, custom picker, wallet multi-select by bank, category multi-select, transaction types, status, and search), responsive pagination, and real-time aggregate totals.

## Requirements

### Requirement: Full-Width Tabular Transaction Ledger
The ledger studio SHALL render all user transactions in a full-width, high-density table displaying Date, Description, Kategori (resolved category name), Dari Akun, Ke Akun (for transfers), Status (realized/planned), and Amount with tabular numeric alignment, and support configurable pagination bounds.

#### Scenario: View Transaction Rows with Category Column
- **WHEN** user navigates to `/ledger`
- **THEN** each transaction row explicitly displays the resolved category name (e.g. "Makan & Minum", "Tagihan & Utilitas") alongside its description, source wallet, and amount.

#### Scenario: Configure Pagination Page Size
- **WHEN** user selects a page size limit (25, 50, or 100)
- **THEN** the ledger renders the requested number of rows per page with a bounded navigation stepper.

### Requirement: Super Dynamic Multi-Faceted Filter Engine
The ledger studio SHALL provide client-side filtering by 2-Click Date Range (presets: "Bulan Ini" [default], "Bulan Depan", "Bulan Lalu", "Hari Ini", "Semua Waktu", "Rentang Khusus" without native HTML inputs), Searchable Multi-Select Combobox for Wallets (grouped by bank) and Categories, Category ID matching, Type, Status, and Search.

#### Scenario: Filter by Category ID
- **WHEN** user selects or navigates to category "Makan & Minum"
- **THEN** the ledger matches transactions where `t.transactionCategoryId === categoryId`, correctly displaying all associated food and beverage transactions regardless of their individual description text.

#### Scenario: Select Date Range via 2-Click Calendar
- **WHEN** user clicks a start date and an end date on the custom calendar popover
- **THEN** the date range is immediately applied with active visual range highlighting.

#### Scenario: Search and Multi-Select in Combobox
- **WHEN** user types in the wallet or category combobox search input
- **THEN** the list filters instantly without requiring manual scrolling, and user can check multiple items simultaneously.

### Requirement: Dynamic Filtered Financial Aggregates
The ledger studio SHALL dynamically compute and display the sum of income, sum of expenses, and net cashflow for the currently filtered set of transactions.

#### Scenario: Display Filtered Aggregate Bar
- **WHEN** any filter (date, wallet, category, or type) is applied or adjusted
- **THEN** a summary bar above the table displays: matching transaction count, total income (`+Rp X`), total expense (`−Rp Y`), and net delta (`±Rp Z`).
