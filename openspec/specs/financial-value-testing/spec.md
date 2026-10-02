# financial-value-testing Specification

## Purpose
Prove persisted financial CRUD and the numeric correctness of existing dashboard, transaction, wallet, budget, and goal surfaces using isolated real-account fixtures, independent calculations, historical periods, and three-month forecasts.

## Requirements

### Requirement: Independent Expected Values

Financial verification MUST calculate expectations from the test's accepted inputs and mutation journal, independently of production calculation helpers and API responses. Money comparisons MUST use exact currency precision; percentage and date comparisons MUST use the documented rule for the field being tested. Expected values MUST NOT be replaced with observed values to make a test pass.

#### Scenario: Expense Amount Is Updated
- **WHEN** a realized expense changes from IDR 400,000 to IDR 600,000
- **THEN** its source wallet decreases by an additional IDR 200,000 and its eligible budget spending increases by IDR 200,000
- **AND** unaffected wallets and linked-goal balances remain unchanged.

#### Scenario: A Financial Assertion Fails
- **WHEN** an observed amount, date, status, or formula differs from the independent expectation
- **THEN** the check fails with its entity, period, expected value, and observed value
- **AND** the result is not concealed by a mock fallback, absent-element conditional, broad tolerance, or skipped assertion.

### Requirement: Persisted Browser CRUD Verification

The suite MUST exercise actual browser create/read/update actions for wallets, categories, transactions including transfers, budgets, goals, and recurring templates. It MUST verify accepted input values and persisted state through independent API reads and rendered details. The final Delete actions MUST follow the isolation and late-delete requirements in `entity-crud`.

#### Scenario: Entity Creation Is Submitted
- **WHEN** the browser submits a valid wallet, category, budget, goal, or recurring template
- **THEN** the new entity can be read by its persisted ID and displays the submitted supported fields
- **AND** an enabled submit button or matching request URL alone is not sufficient evidence.

#### Scenario: Transaction or Transfer Is Updated
- **WHEN** the browser changes a persisted transaction amount, date, source/target wallet, category, or planning status
- **THEN** its record and the affected wallet, cashflow, budget, and goal results reflect the independently calculated transition
- **AND** unaffected entities retain their prior expected values.

### Requirement: Explicit Temporal and Status Semantics

Every assertion MUST identify whether a number is live capital, selected-period flow, period-closing capital, or a planned-only delta. Historical wallet assertions MUST use date-bounded wallet snapshots; a live account overview MUST NOT be mistaken for a historical balance. Realized, planned, and combined views MUST be validated separately.

#### Scenario: Historical Cashflow Is Selected
- **WHEN** the current account overview is requested for an earlier month
- **THEN** its selected-period cashflow is checked against that month's realized inputs
- **AND** live net-worth and live linked-goal fields are identified as live values rather than asserted as historical closing balances.

#### Scenario: Planned-Only Wallet View
- **WHEN** the first forecast month is queried in planned-only mode with no earlier planned movements
- **THEN** its opening planned balance is zero and its closing result equals the planned movements, excluding existing live capital.

#### Scenario: Combined Future Wallet View
- **WHEN** the same future month is queried in combined mode
- **THEN** its opening balance includes realized capital and prior planned movements exactly once.

### Requirement: Cockpit Numerical Consistency

The suite MUST verify the existing Cockpit's net worth, spendable/locked capital, period income/expense/net savings, bank/wallet totals, category breakdown, budget allocation, goals, and recent-transaction amounts against their appropriate independent expectations.

#### Scenario: Canonical Current-Month Snapshot
- **WHEN** the canonical fixture has current balances of IDR 10,000,000 spendable and IDR 4,000,000 plus IDR 2,000,000 locked
- **THEN** current net worth is IDR 16,000,000, spendable is IDR 10,000,000, and locked is IDR 6,000,000
- **AND** period income is IDR 5,000,000, expense is IDR 1,500,000, and net savings is IDR 3,500,000
- **AND** every displayed amount agrees with the independently computed value at that surface's declared temporal basis.

#### Scenario: Category Expense Breakdown
- **WHEN** the current month contains food expense of IDR 1,000,000 and transport expense of IDR 500,000
- **THEN** the selected-period category amounts total IDR 1,500,000
- **AND** raw two-decimal percentages are 66.67 and 33.33, with integer display rounding of 67 and 33 where that is the UI convention.

#### Scenario: Empty Obligations After Pre-Cleanup
- **WHEN** the canonical fixture creates no debt or loan records
- **THEN** obligation amounts and active obligation lists remain zero/empty rather than incorporating stale account data.

### Requirement: Ledger and Category Numerical Consistency

The suite MUST verify transaction row identity, native amount, fee, date, type, status, wallet/category/budget association, list summaries, category metrics, and pagination. Transfers MUST NOT be counted as income and expense simultaneously; transfer fees MUST follow the economic-flow contract separately from transferred principal.

#### Scenario: Canonical Current-Month Ledger
- **WHEN** the six realized current-month fixture transactions are displayed
- **THEN** the set contains exactly those six IDs with their accepted amounts, dates, and associations
- **AND** the economic summary shows income IDR 5,000,000, expense IDR 1,500,000, and net IDR 3,500,000, excluding transfer principal.

#### Scenario: Category and Wallet Filters
- **WHEN** food-category or destination-wallet filtering is applied
- **THEN** the exact matching transaction IDs and amounts are returned, including incoming transfers for the destination wallet
- **AND** excluded periods, categories, and statuses contribute no value to the filtered metrics.

#### Scenario: Results Span Multiple Pages
- **WHEN** a selected dataset exceeds a requested page size
- **THEN** every matching transaction is accounted for exactly once across pagination
- **AND** totals and historical reconstruction are not derived from the first page alone.

### Requirement: Budget Numerical Consistency

The suite MUST verify budget amount, period, eligible realized spending, remaining amount, utilization, lifecycle status, daily allowance, and displayed allocation headroom. It MUST distinguish raw negative remaining budget from any explicitly clamped spendable headroom.

#### Scenario: Canonical Food Budget
- **WHEN** the food budget is updated to IDR 2,500,000 and eligible realized spending totals IDR 1,000,000
- **THEN** its remaining budget is IDR 1,500,000 and its utilization is 40 percent
- **AND** planned occurrences and expenses outside its period do not inflate realized spending.

#### Scenario: Budget Without Category
- **WHEN** a budget has no category association
- **THEN** only transactions explicitly assigned to that budget and within its period contribute to its spending.

#### Scenario: Spending Exceeds Budget
- **WHEN** eligible spending exceeds the configured amount
- **THEN** raw remaining budget is negative and utilization exceeds 100 percent according to the documented calculation
- **AND** a progress bar's visual cap or non-negative headroom does not hide the raw over-budget state.

### Requirement: Transaction-Derived Goal Numerical Consistency

The suite MUST verify target/current/remaining amounts, linked-wallet breakdown, progress, lifecycle, and visible pacing. Linked-goal current amounts MUST change through their wallets, without a manual balance patch or contribution operation. API elapsed-time pacing and calendar-month horizon pacing MUST be tested against their distinct documented formulas.

#### Scenario: Canonical Linked Goals
- **WHEN** the emergency wallet holds IDR 4,000,000 against a goal target of IDR 10,000,000 and the trip wallet holds IDR 2,000,000 against IDR 5,000,000
- **THEN** both goals show 40 percent progress, with remaining amounts IDR 6,000,000 and IDR 3,000,000 respectively
- **AND** their current amounts equal their linked wallet aggregates.

#### Scenario: Multiple Linked Wallets
- **WHEN** a goal links multiple wallets
- **THEN** its current amount equals their converted aggregate exactly once
- **AND** linking/unlinking changes the aggregate without creating money movements.

#### Scenario: Goal Completion and Missing Deadline
- **WHEN** a goal reaches its target or has no target date
- **THEN** completion, remaining amount, and nullable pacing use the documented rule for that field
- **AND** API precision, display rounding, and visual progress caps are checked separately.

### Requirement: Nonzero Historical Reconstruction

The suite MUST seed real transactions in at least two prior calendar months and verify those months' transaction sets and each wallet's opening balance, inflow, outflow, delta, and closing balance. It MUST also verify consolidated, spendable, locked, and institution totals on the existing historical wallet surfaces.

#### Scenario: Two Historical Months
- **WHEN** the canonical fixture is viewed in M-2 and M-1
- **THEN** the three closing wallet balances are respectively IDR 6,000,000/2,000,000/1,000,000 and IDR 8,000,000/3,000,000/1,500,000
- **AND** total closing wealth is respectively IDR 9,000,000 and IDR 12,500,000
- **AND** historical flow totals exclude later realized and planned transactions.

#### Scenario: Adjacent Date Boundaries
- **WHEN** transactions fall at a prior month's final UTC instant and the next month's first UTC instant
- **THEN** each is included in its own canonical period exactly once and excluded from the adjacent period.

### Requirement: Three-Month Per-Wallet and Per-Goal Forecast

The suite MUST verify explicit next-month, second-month, and third-month date intervals through the API and existing Ledger, Accounts, and Goals horizon surfaces. Forecast setup MUST rely on materialized planned occurrences and MUST NOT realize them. Every wallet's monthly movement and closing balance, consolidated flow/capital, and each goal's monthly amount/progress increment MUST be asserted.

#### Scenario: Recurring Setup Creates the Roadmap
- **WHEN** five monthly templates plan income IDR 5,000,000, food expense IDR 1,000,000, transport expense IDR 500,000, emergency transfer IDR 1,000,000, and trip transfer IDR 500,000
- **THEN** the selected next three months contain five distinct applicable planned occurrences per month
- **AND** stored live wallet balances and current goal amounts remain unchanged.

#### Scenario: Three Combined Forecast Months
- **WHEN** those future intervals are projected from the canonical live capital
- **THEN** operating-wallet closing balances are IDR 12,000,000, 14,000,000, and 16,000,000
- **AND** emergency-wallet closing balances are IDR 5,000,000, 6,000,000, and 7,000,000
- **AND** trip-wallet closing balances are IDR 2,500,000, 3,000,000, and 3,500,000
- **AND** consolidated closing wealth is IDR 19,500,000, 23,000,000, and 26,500,000.

#### Scenario: Monthly Goal Progress Increments
- **WHEN** the same future periods are shown for the two linked goals
- **THEN** each goal progresses from 40 to 50, 60, and 70 percent
- **AND** each monthly increase is 10 percentage points, not 10 percent relative growth.

#### Scenario: Two-Month Projection Agrees With Three-Month Projection
- **WHEN** the first two explicit periods are requested separately
- **THEN** their wallet/goal results equal the corresponding first two periods of the three-period result.

#### Scenario: No Future Movements in Realized Mode
- **WHEN** the canonical future periods are queried in realized-only mode
- **THEN** the three wallet balances remain IDR 10,000,000/4,000,000/2,000,000 and future cashflow is zero.

#### Scenario: Planned Expense Creates a Future Deficit
- **WHEN** an additional planned operating-wallet expense of IDR 20,000,000 is added to M+3 after canonical forecast validation
- **THEN** that period's operating closing balance is IDR -4,000,000 and consolidated closing wealth is IDR 6,500,000
- **AND** live wallet capital remains unchanged and the two goal projections retain their unaffected linked-wallet balances.

### Requirement: Status and Fee Transition Boundaries

After canonical forecast verification, the suite MUST exercise meaningful monetary transitions including fees, planned realization, transaction type/wallet/date changes, and recurrence edits. It MUST update its independent journal for each accepted transition and verify unchanged entities and exactly-once effects.

#### Scenario: Transfer With Fee
- **WHEN** a realized transfer of IDR 100,000 has an admin fee of IDR 5,000
- **THEN** the source decreases IDR 105,000, the destination increases IDR 100,000, and consolidated wealth decreases IDR 5,000
- **AND** economic expense includes the fee but not the transfer principal.

#### Scenario: Planned Occurrence Is Realized With Actual Amount
- **WHEN** an existing planned expense of IDR 100,000 is realized at IDR 120,000
- **THEN** the same transaction ID becomes realized, planned amount remains available for variance, and the wallet decreases by IDR 120,000 exactly once
- **AND** repeat realization fails without another debit.

### Requirement: Honest Live and Offline Evidence

Live value checks MUST observe real authorized API persistence and rendered financial surfaces without financial response mocks. Offline resilience, currency rules, and calculation boundaries SHALL be verified in deterministic isolated tests and identified as offline evidence. Desktop and mobile checks MUST exercise the actual controls and amounts that exist on each layout.

#### Scenario: Financial API Fails During a Live Check
- **WHEN** a required live financial request fails or the application enters mock/offline mode
- **THEN** the live scenario fails with redacted diagnostics rather than passing on fallback data.

#### Scenario: Desktop and Mobile Display the Same Fixture
- **WHEN** the verified fixture is opened on desktop and mobile layouts
- **THEN** shared metrics and details have the same expected values
- **AND** mobile checks use their actual responsive controls rather than conditionally ignoring an absent desktop button.

#### Scenario: No Visible Goal Rows on Ledger Horizon
- **WHEN** Ledger Horizon is validated
- **THEN** its existing flow, capital, and transaction columns are checked
- **AND** goal-row assertions run on the Goals Horizon surface instead of claiming Ledger renders a feature it does not contain.
