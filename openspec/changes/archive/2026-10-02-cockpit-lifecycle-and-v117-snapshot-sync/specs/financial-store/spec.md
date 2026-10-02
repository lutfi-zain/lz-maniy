# Spec Delta: financial-store

## ADDED Requirements

### Requirement: Snapshot Budget Preservation on Standalone Fetch
The financial store MUST preserve the temporally-filtered `snapshot.budgets` array when standalone budget queries (`fetchBudgets()`) are executed for historical management views.

#### Scenario: Standalone budgets fetch does not pollute active snapshot
- **WHEN** `reedrichStore.fetchBudgets()` is invoked to populate `/planning`
- **THEN** the returned collection MUST update `allBudgets` without overwriting `this.snapshot.budgets`
- **AND** returning to the Cockpit dashboard MUST continue displaying only the temporally-filtered budgets from `snapshot.budgets`.
