# Spec Delta: planning-studio

## ADDED Requirements

### Requirement: Goal Lifecycle Workspace Filtering and Overdue Highlighting
The planning studio Goals workbench SHALL display lifecycle indicators and support status-based view segmentation.

#### Scenario: Goals Status Segmented Bar
- **WHEN** user views the Goals tab at `/planning`
- **THEN** a segmented tab bar is displayed with options: `Semua`, `Aktif (In Progress)`, `Lewat Tenggat (Overdue)`, and `Tercapai (Completed)`
- **AND** each tab pill shows a count badge of items in that state.

#### Scenario: Overdue Goal Card Presentation
- **WHEN** a goal is evaluated as `overdue`
- **THEN** the card renders a distinct warning overdue badge (`bg-[#FDEBEC] text-[#9F2F2D]`)
- **AND** displays the overdue elapsed day count and remaining nominal shortfall.

### Requirement: Budget Temporal Workspace Filtering
The planning studio Budgets workbench SHALL provide period-based filtering to separate current month budgets from historical records.

#### Scenario: Budgets Period Segmented Bar
- **WHEN** user views the Budgets tab at `/planning`
- **THEN** a segmented tab bar is displayed with options: `Periode Berjalan (Bulan Ini)` (default), `Riwayat Lampau`, and `Semua`.

#### Scenario: Historical Budget Muted Presentation
- **WHEN** viewing budgets under `Riwayat Lampau`
- **THEN** cards render with subtle visual muting (opacity 85%) and a neutral badge indicating the expired period span.
