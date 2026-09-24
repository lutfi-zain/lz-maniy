# drilldown-drawer Specification

## Purpose
Provides an accessible, slide-over detail surface that opens upon clicking any dashboard entity (wallet, expense category, budget, goal, obligation) to present deep contextual metadata and on-demand transaction logs.

## Requirements

### Requirement: Interactive Drilldown Triggering
Clicking any wallet card, category breakdown row, budget card, goal card, or obligation item SHALL open the slide-over drawer populated with that entity's specific data.

#### Scenario: Open Wallet Detail on Click
- **WHEN** a user clicks on any wallet card (e.g., "BCA Main")
- **THEN** the slide-over drawer animates into view showing the wallet's metadata, current balance, locked status, and last transaction summary.

#### Scenario: Open Category Detail on Click
- **WHEN** a user clicks on a category breakdown row (e.g., "Makan & Minum")
- **THEN** the drawer displays category name, total monthly expenditure, percentage of total expenses, and the list of transactions tagged with that category.

#### Scenario: Open Goal Detail on Click
- **WHEN** a user clicks on a goal card
- **THEN** the drawer displays full goal pacing, target dates, and a granular table of all contributing wallets with live balances and exchange rate indicators.

### Requirement: Lazy Loading of Filtered Transactions
The drawer SHALL lazily fetch transaction records from the backend API for the active entity and display them with status, type, and formatted amounts.

#### Scenario: Fetch and Display Transactions for Selected Wallet
- **WHEN** the wallet drawer opens
- **THEN** an API request is dispatched for that wallet's transactions, a loading state is rendered during transit, and the returned transactions are displayed in a clean tabular view.

#### Scenario: Handle Empty Transaction History
- **WHEN** a selected entity has no recorded transactions
- **THEN** the drawer displays a clear, neutral empty-state message without throwing runtime errors.

### Requirement: Accessible Dismissal
The drawer SHALL support dismissal via close button, clicking the backdrop, or pressing the `Escape` key, restoring viewport scroll upon closure.

#### Scenario: Dismiss with Escape Key
- **WHEN** the drawer is open and the user presses the `Escape` key
- **THEN** the drawer slides out of view, the backdrop fades, and normal page interaction resumes.
