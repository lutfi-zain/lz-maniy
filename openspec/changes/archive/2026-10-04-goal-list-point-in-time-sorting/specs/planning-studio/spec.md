## ADDED Requirements

### Requirement: Goals List Point-in-Time Accumulation and Sorting
The Planning Studio Goals list workbench (`/planning`) SHALL dynamically synchronize with the active date filter window (`startDate` and `endDate`), accumulating point-in-time balances for both derived and standalone savings goals, resolving lifecycle statuses relative to the selected period end date, and ordering goals by highest accumulated current amount.

#### Scenario: Display Point-in-Time Goal Balances on Filtered Date Range
- **WHEN** user selects a custom date range (e.g. `2026-11-01` to `2026-11-30`) in the Goals List view
- **THEN** the system queries wallet point-in-time balances bounded by those dates
- **AND** derived goal cards reflect accumulated balances computed from their underlying linked wallets' point-in-time balances converted to IDR
- **AND** goal progress percentages and remaining amounts update relative to that period's accumulated balance.

#### Scenario: Evaluate Goal Lifecycle Status against Selected Period End Date
- **WHEN** user evaluates goal lifecycle in a historical or future date window
- **THEN** `resolveGoalLifecycle` evaluates `isOverdue` and `daysRemaining` against the window's `endDate` rather than today's local date
- **AND** goals whose deadlines occurred before the selected `endDate` and did not reach their target are flagged with the overdue status badge.

#### Scenario: Default Sort by Highest Accumulated Current Amount
- **WHEN** user views the Goals List view
- **THEN** goal cards are sorted descending by their accumulated current amount (`liveCurrent`) so the goal with the largest saved balance appears first
- **AND** ties or zero-balance goals fallback to secondary sorting by target amount or name.

#### Scenario: Transition from Horizon Board Maximize to Filtered Sorted List
- **WHEN** user clicks "Maksimalkan periode ke tampilan List" on a period column in the Goals Horizon Board
- **THEN** the view mode switches to `List`
- **AND** the date filter is configured to that period's start and end date
- **AND** the List view displays goals reflecting that period's accumulated point-in-time balances
- **AND** the cards are sorted descending by that period's accumulated balance.

## MODIFIED Requirements

### Requirement: In-Memory Planning Studio Filter Persistence Across Navigation
Active sub-tab selections, status filters, and sorting criteria in the Planning studio SHALL persist in memory across page navigation until browser reload.

#### Scenario: Retain Active Planning Sub-Tab and Filters
- **WHEN** user selects a sub-tab (e.g. `Goals` or `Budgets`), a lifecycle filter (e.g. `Lewat Tenggat`), or changes goal sorting (e.g. `Nominal Terkumpul Terbesar`) on `/planning`
- **AND** navigates to `/ledger` or `/accounts` and returns to `/planning`
- **THEN** the active sub-tab, the applied status filter, and the selected goal sorting order remain active and undisturbed.
