# Spec Delta: ledger-studio

## MODIFIED Requirements

### Requirement: Multi-Period Horizon Board View
The ledger studio SHALL provide a multi-period wrapping grid view displaying user-selected monthly horizon columns, with each column rendering transactions and cashflow metrics without savings goal pacing.

#### Scenario: View Cashflow Columns without Goal Pacing
- **WHEN** user switches to the `Horizon Board` view on `/ledger`
- **THEN** each monthly period column renders the transaction items and the `PeriodSummaryCard`
- **AND** the summary card renders cashflow metrics (In, Out, Net) and point-in-time Net Worth breakdown (Closing Net Worth, Spendable, Committed)
- **AND** does NOT render any savings goal progress bars, milestones, or pacing targets.

#### Scenario: Toggle Between List and Horizon Board
- **WHEN** user views the view mode switcher on `/ledger`
- **THEN** the first toggle option is labeled "List" with a table icon
- **AND** the second toggle option is labeled "Horizon Board" with a calendar icon
- **AND** clicking either toggle immediately transitions the viewport between high-density tabular list and multi-period column board.

## ADDED Requirements

### Requirement: Horizon Board Period Maximize Action
Each period column in the Ledger Horizon Board SHALL provide a Maximize action button to inspect that single month in the primary List view.

#### Scenario: Click Column Maximize Button
- **WHEN** user clicks the Maximize button (adjacent to the Quick-Add Plus button) in a period column header (e.g., "Oktober 2026")
- **THEN** the global date filter is updated to cover that exact period (`2026-10-01` to `2026-10-31`)
- **AND** the ledger view mode is switched to `List`
- **AND** the ledger table immediately displays all transactions belonging to that specific month.

### Requirement: In-Memory Ledger Filter Persistence Across Navigation
Active filter selections on the Ledger studio SHALL persist in memory across SPA page navigation until the browser session is reloaded.

#### Scenario: Retain Filters After Navigating Away and Returning
- **WHEN** user selects specific wallet filters, category filters, transaction type filters, or enters a search query on `/ledger`
- **AND** navigates to `/accounts` or `/planning`
- **AND** subsequently navigates back to `/ledger`
- **THEN** all previously chosen wallet IDs, category IDs, budget IDs, type, status, and search keywords remain active and applied.

#### Scenario: Reset Filters on Browser Page Refresh
- **WHEN** user reloads the browser tab (F5 or hard refresh)
- **THEN** ledger filters reset to their default unconstrained state.
