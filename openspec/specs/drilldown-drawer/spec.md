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

### Requirement: Transaction Detail Drawer Type
The drawer SHALL support a `transaction-detail` type that displays full metadata for a single transaction record.

#### Scenario: Open Transaction Detail
- **WHEN** a drawer is opened with `type: "transaction-detail"` and a `TransactionRecord` in its data payload
- **THEN** the drawer renders a formatted, read-only detail view of that transaction including date, description, category, wallet routing, amount, fees, type, and planned status

### Requirement: Transaction Form Drawer Type
The drawer SHALL support a `transaction-form` type that provides create and edit form functionality.

#### Scenario: Open Create Form
- **WHEN** a drawer is opened with `type: "transaction-form"` and no existing transaction in its data payload
- **THEN** the drawer renders an empty form in create mode with the type switcher defaulting to expense

#### Scenario: Open Edit Form
- **WHEN** a drawer is opened with `type: "transaction-form"` and an existing `TransactionRecord` in its data payload
- **THEN** the drawer renders the form pre-populated with the transaction's current values in edit mode

### Requirement: Full Entity Field Rendering in Drawer Detail Views
The drilldown drawer views SHALL render the complete set of supported fields for Goals, Budgets, Wallets, and Transactions.

#### Scenario: Render Goal Detail with Notes, Pacing, and Target Date
- **WHEN** user opens a goal detail drawer
- **THEN** the drawer displays:
  - Goal Notes block (when `notes` is non-empty)
  - Target deadline date and resolved days remaining
  - Daily and monthly recommended savings pacing metrics (`pacing.requiredDailySavings`, `pacing.requiredMonthlySavings`)
  - Status badge (In Progress, Overdue, or Completed).

#### Scenario: Render Budget Detail with Period and Category
- **WHEN** user opens a budget detail drawer
- **THEN** the drawer displays:
  - Formatted active period range (`dFmt(periodStart)` to `dFmt(periodEnd)`)
  - Category tag and spending limit headroom
  - Embedded transaction ledger table filtered to the budget ID.

#### Scenario: Render Transaction Detail with Recurring Origin and Realization Timestamps
- **WHEN** user opens a transaction detail drawer
- **THEN** the drawer displays:
  - Linked recurring template origin (if originated from a recurring rule)
  - Scheduled occurrence date
  - Realized timestamp and planned amount difference (if realized from planned forecast).

### Requirement: Pre-Edit Server Hydration and Loading State
When transitioning from detail view to edit mode, the drawer SHALL ensure form stores receive fresh data from the server.

#### Scenario: Hydrate Goal Before Edit
- **WHEN** user clicks the edit (pencil) button in `GoalDrawerContent`
- **THEN** a lightweight loading skeleton appears while `fetchGoalById(goalId)` executes
- **AND** once resolved, `goalFormStore` is populated with the freshly fetched server values before the edit form opens.
