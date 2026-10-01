# Spec Delta: ledger-studio

## ADDED Requirements

### Requirement: Context-Aware Ledger Horizon Toolbar
The Ledger studio toolbar SHALL conditionally hide the global `DateRangePicker` when the multi-period Horizon Board view is active.

#### Scenario: Hide Date Range Picker in Horizon Mode
- **WHEN** user selects `Horizon Board` view mode on `/ledger`
- **THEN** the top `DateRangePicker` is hidden from the filter toolbar
- **AND** when user selects `List` view mode, the `DateRangePicker` is restored.
