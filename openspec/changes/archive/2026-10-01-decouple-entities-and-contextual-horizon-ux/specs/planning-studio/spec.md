# Spec Delta: planning-studio

## ADDED Requirements

### Requirement: Sub-Tab Standalone Entity Synchronization
The Planning studio (`/planning`) SHALL query standalone entity endpoints when corresponding sub-tabs become active.

#### Scenario: On-Demand Sub-Tab Entity Query
- **WHEN** user activates the `Budgets` sub-tab
- **THEN** `reedrichStore.fetchBudgets()` is invoked
- **WHEN** user activates the `Goals` sub-tab
- **THEN** `reedrichStore.fetchGoals()` is invoked
- **WHEN** user activates the `Obligations` sub-tab
- **THEN** `reedrichStore.fetchDebtsLoans()` and `reedrichStore.fetchRecurringTemplates()` are invoked.

### Requirement: Context-Aware Goals Horizon Toolbar
The Planning studio toolbar SHALL hide redundant date range filters when viewing the Goals Horizon Board.

#### Scenario: Hide Date Range Picker in Goals Horizon Mode
- **WHEN** user views the `Goals` sub-tab and switches view mode to `Horizon Board`
- **THEN** the top `DateRangePicker` is hidden
- **AND** when view mode is switched back to `List`, the `DateRangePicker` is visible.
