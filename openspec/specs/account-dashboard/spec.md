# account-dashboard Specification

## Purpose
Renders a consolidated personal financial intelligence dashboard partitioned into high-level KPIs, categorized wallet lists, monthly cashflow with expense breakdown, active spending budgets, savings goals with multi-wallet allocations, and active obligations.

## Requirements

### Requirement: Consolidated Net Worth & Currency Breakdown
The dashboard SHALL display the user's consolidated net worth in IDR, including sub-aggregations by currency and financial institution derived from the primary account detail snapshot, using high-precision typography and tabular numbers without decorative literary serif fonts or ambient background animations.

#### Scenario: Display Consolidated Net Worth
- **WHEN** account detail data is successfully loaded
- **THEN** the dashboard displays the total consolidated net worth with live FX conversion notation and pills showing allocation across each institution (e.g., BCA, Bank Jago, OCBC, GoPay, Bitget, General).

#### Scenario: Filter Wallets by Institution Pill
- **WHEN** a user clicks on an institution pill in the Net Worth card
- **THEN** the wallet list highlights or filters to show only wallets associated with that institution.

### Requirement: Executive Cockpit Operational Workbench
The dashboard SHALL provide a compact 3-column operational cockpit at `/` containing quick bank balances on the left, a date-filterable live recent transaction feed in the center using the shared DateRangePicker component, and monthly allocation pacing on the right.

#### Scenario: Scan Daily Financial Cockpit
- **WHEN** user loads the home cockpit route `/`
- **THEN** user can view their entire cash position, recent transaction activity, and critical runway alerts on one screen without opening nested modals or drawers.

#### Scenario: Filter Recent Mutations by Date Range on Cockpit
- **WHEN** user changes the date range preset (e.g. to "Bulan Ini" or "Bulan Depan") in the Cockpit workbench
- **THEN** the recent mutations feed filters dynamically to transactions within that date range.

### Requirement: Standardized Status Indicators & Multi-Currency Aggregations
The dashboard SHALL display account and reserve statuses using a unified visual language (amber lock icon for Cadangan, green dot for Operasional) and compute all total asset values by converting foreign currency balances (USDT/USD) into IDR using live exchange rates/pegs.

#### Scenario: Uniform Status Display
- **WHEN** viewing account status indicators on the cockpit
- **THEN** spendable operational cash is consistently marked with a green indicator and locked reserve cash is marked with an amber lock icon.

#### Scenario: Multi-Currency Total Asset Conversion
- **WHEN** calculating total net worth or total asset holdings
- **THEN** foreign currency balances (such as Bitget USDT) are automatically converted to IDR and included in the grand total.

### Requirement: Partitioned Wallet Accounts
The dashboard SHALL partition wallets into Spendable (unlocked operational cash) and Locked (protected reserves, house rent savings, child doctor funds).

#### Scenario: View Spendable vs Locked Wallets
- **WHEN** a user toggles between "Spendable" and "Locked" tabs
- **THEN** the dashboard displays only the matching wallets along with balance, institution, and last transaction summary.

### Requirement: Monthly Cashflow & Category Breakdown
The dashboard SHALL display monthly total income, total expense, and net savings surplus/deficit, along with an ordered breakdown of expenses by category with percentages and visual tracks.

#### Scenario: View Category Allocation
- **WHEN** monthly cashflow data is displayed
- **THEN** each expense category renders with its name, formatted amount in IDR, percentage of total expenses, and a proportional horizontal bar.

### Requirement: Savings Goals with Derived Linked Wallets
The dashboard SHALL render financial savings goals, displaying target amount, current accumulated amount, progress percentage, remaining days, and a breakdown of all linked backing wallets.

#### Scenario: Display Derived Goal Breakdown
- **WHEN** a goal is derived from multiple wallets (such as "Sewa Rumah 2026")
- **THEN** the goal card lists each contributing wallet, its original currency balance, and the converted IDR value.

### Requirement: Active Obligations
The dashboard SHALL display active debt liabilities and loan receivables with remaining balance, due dates, and status.

#### Scenario: Display Debt and Loan Items
- **WHEN** active debts or loans exist in obligations data
- **THEN** debts render with negative amounts in red and loans render with positive amounts in green, along with due date and status badges.
