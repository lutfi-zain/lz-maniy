# planning-studio Specification

## Purpose
Provides a dedicated financial planning studio at `/planning` featuring distinct workbenches for active spending budgets with utilization pacing, multi-wallet derived savings goals with timeline milestones, and active obligations (debts, loans, and recurring bill templates).

## Requirements

### Requirement: Active Spending Budgets Workspace
The planning studio SHALL display category and period-based spending limits, calculating live utilization percentages and remaining allowances.

#### Scenario: Display Budget Utilization Bar
- **WHEN** user views the Budgets section
- **THEN** each active budget displays its name, limit amount, spent amount, remaining allowance, and an alert state indicator (on track, warning >= 80%, or over budget > 100%).

### Requirement: Derived Savings Goals with Multi-Wallet Allocation
The planning studio SHALL display savings goals, tracking target amounts, accumulated savings (including foreign currency wallets converted into IDR via live pegs), days remaining to deadline, and a detailed breakdown of all underlying linked wallets and live conversion rates.

#### Scenario: View Sewa Rumah 2026 Goal Pacing
- **WHEN** user views the "Sewa Rumah 2026" goal
- **THEN** the interface displays target (Rp 18.000.000), current amount (Rp 14.230.897,52), progress percentage (79%), remaining days, and the exact contribution from BCA Pocket, Jago Sewa Rumah, OCBC, and Bitget USDT.

#### Scenario: View Multi-Currency Accumulated Goal Total
- **WHEN** user views the "Sewa Rumah 2026" goal
- **THEN** the total accumulated savings reflects the sum of all contributing IDR wallets plus the converted IDR value of foreign currency wallets (e.g. Bitget 115.61 USDT converted to Rp 2.061.999), matching the live total of Rp 14.230.897,52.

### Requirement: Obligations & Recurring Cashflow Templates
The planning studio SHALL display active liabilities (debts), receivables (loans), and recurring bill templates with scheduled next-run dates.

#### Scenario: View Debt Deadlines and Recurring Bills
- **WHEN** user views the Obligations tab
- **THEN** debts (e.g., Cicilan Yamaha Nmax, Istri) render with due dates, loans render with repayment expectations, and 13 recurring templates display frequency and upcoming debit dates.

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
