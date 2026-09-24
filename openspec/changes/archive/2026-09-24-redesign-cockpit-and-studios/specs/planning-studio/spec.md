# Spec Delta: planning-studio

## Purpose
Provides a dedicated financial planning studio at `/planning` featuring distinct workbenches for active spending budgets with utilization pacing, multi-wallet derived savings goals with timeline milestones, and active obligations (debts, loans, and recurring bill templates).

## ADDED Requirements

### Requirement: Active Spending Budgets Workspace
The planning studio SHALL display category and period-based spending limits, calculating live utilization percentages and remaining allowances.

#### Scenario: Display Budget Utilization Bar
- **WHEN** user views the Budgets section
- **THEN** each active budget displays its name, limit amount, spent amount, remaining allowance, and an alert state indicator (on track, warning >= 80%, or over budget > 100%).

### Requirement: Derived Savings Goals with Multi-Wallet Allocation
The planning studio SHALL display savings goals, tracking target amounts, accumulated savings, days remaining to deadline, and a detailed breakdown of all underlying linked wallets and live conversion rates.

#### Scenario: View Sewa Rumah 2026 Goal Pacing
- **WHEN** user views the "Sewa Rumah 2026" goal
- **THEN** the interface displays target (Rp 18.000.000), current amount (Rp 14.230.897,52), progress percentage (79%), remaining days, and the exact contribution from BCA Pocket, Jago Sewa Rumah, OCBC, and Bitget USDT.

### Requirement: Obligations & Recurring Cashflow Templates
The planning studio SHALL display active liabilities (debts), receivables (loans), and recurring bill templates with scheduled next-run dates.

#### Scenario: View Debt Deadlines and Recurring Bills
- **WHEN** user views the Obligations tab
- **THEN** debts (e.g., Cicilan Yamaha Nmax, Istri) render with due dates, loans render with repayment expectations, and 13 recurring templates display frequency and upcoming debit dates.
