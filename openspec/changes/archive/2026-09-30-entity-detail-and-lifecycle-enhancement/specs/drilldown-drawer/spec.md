# Spec Delta: drilldown-drawer

## ADDED Requirements

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
