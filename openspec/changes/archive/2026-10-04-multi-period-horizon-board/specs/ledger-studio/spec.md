# Spec Delta


## ADDED Requirements

### Requirement: View Mode Switcher
The Ledger Studio header SHALL provide a toggle to switch between single-period list view and multi-period horizon board view.

#### Scenario: Toggle to Horizon Board
- **WHEN** user clicks the "Horizon Board" option in the view mode switcher on a desktop viewport (>= 1024px)
- **THEN** the ledger transitions from the single-period tabular view to the multi-period grid board
- **THEN** the selected view mode persists via `UserSettings` so it survives page refresh and device changes

#### Scenario: Toggle Back to List View
- **WHEN** user clicks the "List View" option in the view mode switcher while viewing the horizon board
- **THEN** the ledger returns to the existing single-period tabular view with all filters preserved

#### Scenario: View Switcher Hidden on Mobile
- **WHEN** viewport width is below 1024px
- **THEN** the view mode switcher is not rendered and the ledger always displays the single-period list view
