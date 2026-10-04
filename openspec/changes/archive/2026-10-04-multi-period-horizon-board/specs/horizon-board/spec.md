# Spec Delta

## Purpose
Multi-period calendar board view within Ledger Studio that renders configurable monthly period columns in a wrapping grid, each containing a dense transaction ledger and a cascading financial summary, enabling forward-looking planning and cross-period comparison.

## ADDED Requirements

### Requirement: Period Column Grid Layout
The horizon board SHALL render period columns in a responsive wrapping CSS Grid that flows to additional rows when columns exceed the viewport width.

#### Scenario: Desktop Default Grid (>= 1280px)
- **WHEN** user activates the horizon board view on a desktop viewport >= 1280px with 3 periods configured
- **THEN** three period columns render in a single row with equal width within the max-w-[1400px] content area
- **THEN** each column is a Card with 1px solid #EAEAEA border and 8px border-radius on Warm Bone (#F7F6F3) canvas

#### Scenario: Wrap to Multiple Rows
- **WHEN** user has more periods than fit in a single row (e.g. 5+ periods on a 1280px viewport)
- **THEN** excess columns wrap to the next row maintaining consistent column widths and gap spacing
- **THEN** no horizontal scrollbar appears on the board container

#### Scenario: Narrower Desktop Viewport (1024px–1279px)
- **WHEN** viewport width is between 1024px and 1279px
- **THEN** period columns display 2 per row, wrapping remaining columns to subsequent rows

#### Scenario: Below Desktop Threshold (< 1024px)
- **WHEN** viewport width is below 1024px
- **THEN** the horizon board view mode is hidden from the view switcher
- **THEN** the ledger defaults to the existing single-period list view

### Requirement: Configurable Period Management
The horizon board SHALL allow users to add and remove monthly periods with a start and end date configuration, defaulting to 3 consecutive months.

#### Scenario: Default Period Initialization
- **WHEN** user activates the horizon board for the first time with no saved configuration
- **THEN** 3 consecutive monthly periods are displayed: current month, next month, and month after next
- **THEN** each period spans from the 1st to the last day of its respective month

#### Scenario: Add Period via Date Selection
- **WHEN** user clicks the "Tambah Periode" action card at the end of the grid
- **THEN** a popover presents month/year selection controls
- **THEN** upon confirming, the selected period appends to the grid and the configuration persists

#### Scenario: Remove Period from Board
- **WHEN** user clicks the remove action on a period column header
- **THEN** the period is removed from the board and the configuration updates immediately
- **THEN** remaining period columns reflow within the grid without gaps

#### Scenario: Minimum Period Constraint
- **WHEN** only one period remains on the board
- **THEN** the remove action on that period is disabled to prevent an empty board

### Requirement: Dense Per-Period Ledger Table
Each period column SHALL contain a compact transaction table supporting full CRUD operations scoped to that period's date range.

#### Scenario: Period-Scoped Transaction Display
- **WHEN** a period column renders for October 2026
- **THEN** only transactions with `transactionDate` between 2026-10-01 and 2026-10-31 appear in the column's ledger table
- **THEN** transactions are sorted by date descending

#### Scenario: Compact Two-Line Row Format
- **WHEN** transaction rows render inside a period column
- **THEN** each row displays: line 1 — date (short format: "14 Okt"), description (truncated), and amount (mono font, green for income, charcoal for expense); line 2 — category chip (muted pastel), wallet name (gray), and status badge (Planned/Realized)

#### Scenario: Quick Add Transaction in Period
- **WHEN** user clicks the "+ Transaksi" quick-add button in a period column header
- **THEN** the TransactionFormDrawer opens in create mode with the transaction date pre-filled to the 1st day of that period's month

#### Scenario: Click Row to Edit
- **WHEN** user clicks a transaction row within a period column
- **THEN** the TransactionFormDrawer opens in view/edit mode for that transaction

#### Scenario: Empty Period State
- **WHEN** a period contains no transactions (e.g. a future month with no planned entries)
- **THEN** the column displays a minimal empty state message ("Belum ada transaksi") with a prominent add action

### Requirement: Per-Period Financial Summary Card
Each period column SHALL display a sticky summary card at its bottom showing cashflow aggregates, projected net worth, and goal snapshots for that period's closing date.

#### Scenario: Cashflow Aggregates
- **WHEN** a period column renders its summary card
- **THEN** the card shows Masuk (total income, green), Keluar (total expense), and Net (income minus expense) in mono font, all amounts converted to IDR

#### Scenario: Cascading Point-in-Time Net Worth
- **WHEN** multiple period columns are displayed (e.g. Oct, Nov, Dec)
- **THEN** the first period computes its closing Net Worth using the existing `calculatePointInTimeNetWorth` function anchored to its end date
- **THEN** each subsequent period's projected Net Worth equals the prior period's closing Net Worth plus the current period's net cashflow
- **THEN** each summary displays Spendable (Bebas) and Locked (Cadangan) breakdown

#### Scenario: Goal Progress Snapshot
- **WHEN** a period's summary card renders and the user has active savings goals
- **THEN** each goal displays its name, current accumulated amount projected at that period's end date, target amount, and progress percentage
- **THEN** goal projections account for planned savings contributions across periods

#### Scenario: Cascade Reactivity on Transaction Mutation
- **WHEN** user adds, edits, or deletes a transaction in any period column
- **THEN** the summary card of that period and all subsequent periods recalculate their cashflow, net worth, and goal projections within the same render cycle

### Requirement: Global Filter Application on Board
The horizon board SHALL respect global filters (wallet, category, type, status, search keyword) applied from the shared filter bar, narrowing transactions across all period columns simultaneously.

#### Scenario: Apply Wallet Filter Across Periods
- **WHEN** user selects a wallet filter in the global filter bar while viewing the horizon board
- **THEN** all period columns filter their transaction tables to show only transactions from the selected wallet(s)
- **THEN** each period's summary card recalculates based on the filtered transaction subset

#### Scenario: Filter Invariance on Net Worth Anchor
- **WHEN** a category or wallet filter narrows the displayed transactions
- **THEN** the per-period Net Worth projection continues to reflect the total multi-wallet portfolio, not the filtered subset, consistent with existing ledger behavior
