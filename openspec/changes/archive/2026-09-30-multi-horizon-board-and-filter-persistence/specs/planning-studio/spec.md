# Spec Delta: planning-studio

## ADDED Requirements

### Requirement: Savings Multi-Period Horizon Board View
The Planning Studio (`/planning`) SHALL provide a dedicated multi-period Horizon Board view specifically on the Goals (Savings) sub-tab to track chronological savings goal accumulation and monthly pacing.

#### Scenario: View Savings Goals Horizon Board
- **WHEN** user selects the `Goals` sub-tab at `/planning` and toggles view mode to `Horizon Board`
- **THEN** chronological monthly period columns are rendered for all active horizons
- **AND** each column displays progress cards for each savings goal showing:
  - Projected accumulated balance at that month-end horizon
  - Target amount and progress percentage
  - Milestone badge (`Tercapai!`) if the goal is projected to reach 100% in or before that month
  - Required monthly savings pacing figure.

#### Scenario: Goals List Mode Default
- **WHEN** user views the `Goals` sub-tab in `List` mode
- **THEN** standard horizontal goal cards are rendered with action buttons, status filters, and drawer drilldowns.

### Requirement: In-Memory Planning Studio Filter Persistence Across Navigation
Active sub-tab selections and status filters in the Planning studio SHALL persist in memory across page navigation until browser reload.

#### Scenario: Retain Active Planning Sub-Tab and Filters
- **WHEN** user selects a sub-tab (e.g. `Goals` or `Budgets`) and a lifecycle/period filter (e.g. `Lewat Tenggat` or `Riwayat Lampau`) on `/planning`
- **AND** navigates to `/ledger` and returns to `/planning`
- **THEN** the active sub-tab and the applied status filter remain active and undisturbed.
