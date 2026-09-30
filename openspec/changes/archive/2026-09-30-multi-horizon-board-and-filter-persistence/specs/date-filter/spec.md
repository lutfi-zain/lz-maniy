# Spec Delta: date-filter

## ADDED Requirements

### Requirement: Horizon Period Column Maximize Date Synchronization
The date filter store SHALL support direct synchronization from period column maximize actions, setting exact monthly calendar boundaries.

#### Scenario: Synchronize Date Bounds from Column Maximize
- **WHEN** a user triggers the Maximize action on a period column representing `YYYY-MM` (e.g., `2026-10`)
- **THEN** `dateFilterStore` is updated with `startDate: '2026-10-01'` and `endDate: '2026-10-31'`
- **AND** preset is updated to `'custom'` or the corresponding period label
- **AND** all subscriber components reactively filter to transactions and balances within that monthly window.
