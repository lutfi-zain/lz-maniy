# Spec Delta: account-matrix

## ADDED Requirements

### Requirement: Bank and Accounts Multi-Period Horizon Board View
The Bank & Accounts studio (`/accounts`) SHALL support a multi-period Horizon Board view displaying chronological point-in-time balance projections for each wallet and liquidity aggregates.

#### Scenario: Switch Accounts View to Horizon Board
- **WHEN** user clicks the `Horizon Board` view toggle on `/accounts`
- **THEN** the view renders chronological period columns for all active configured horizons
- **AND** each period column lists every wallet with its projected balance at that month-end date (`calculatePointInTimeWalletBalances`).

#### Scenario: View Liquidity Aggregate Breakdown Per Horizon
- **WHEN** viewing any period column in the Accounts Horizon Board
- **THEN** the column footer or summary area displays point-in-time Spendable total, Locked total, and Total Net Worth at that horizon date.

#### Scenario: Switch Accounts View to List
- **WHEN** user selects `List` on `/accounts`
- **THEN** the view renders the standard grouped or flat wallet card matrix.

### Requirement: In-Memory Account Matrix Filter Persistence Across Navigation
Active filter and sorting preferences on `/accounts` SHALL persist in memory across client-side SPA navigation until the browser tab is refreshed.

#### Scenario: Retain Accounts Filters Across Navigation
- **WHEN** user changes status filter (e.g. to "Spendable" or "Locked"), search query, or sort order on `/accounts`
- **AND** navigates to `/ledger` or `/planning` and returns to `/accounts`
- **THEN** the status filter, search query, and sort order remain exactly as selected.
