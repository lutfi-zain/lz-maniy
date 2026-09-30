# planning-studio Specification

## Purpose
Provides a dedicated financial planning studio at `/planning` featuring distinct workbenches for active spending budgets with utilization pacing, multi-wallet derived savings goals with timeline milestones, and active obligations (debts, loans, and recurring bill templates).

## Requirements

### Requirement: Active Spending Budgets Workspace
The planning studio SHALL display category and period-based spending limits, calculating live utilization percentages, explicit remaining nominal headroom towards 100%, and distinct overrun representations when limits are exceeded.

#### Scenario: Display Budget Utilization Bar and Headroom on Safe Budget
- **WHEN** user views an active budget whose realized spending is below the allowance (e.g. Spent Rp 3.700.000 out of Limit Rp 5.000.000, 74%)
- **THEN** the card displays a progress bar filled to 74% using the standard charcoal fill (`#111111`)
- **AND** displays an on-track status badge
- **AND** displays the primary remaining headroom metric as `"Sisa Rp 1.300.000 lagi"` in Indonesian or `"Rp 1,300,000 remaining"` in English
- **AND** displays the secondary utilization ratio as `"Rp 3.700.000 / Rp 5.000.000"`.

#### Scenario: Display Budget in Warning State near Limit
- **WHEN** user views an active budget whose utilization is between 80% and 99% (e.g. Spent Rp 850.000 out of Limit Rp 1.000.000, 85%)
- **THEN** the card displays a warning status badge (`bg-[#FEF3C7] text-[#92400E]`)
- **AND** the progress bar fill renders in warning amber (`#D97706`)
- **AND** displays remaining headroom with warning emphasis (`"Sisa Rp 150.000 lagi"` / `"Rp 150,000 remaining"`).

#### Scenario: Display Budget in Over-Budget State
- **WHEN** user views an active budget whose realized spending exceeds the limit (e.g. Spent Rp 5.750.000 out of Limit Rp 5.000.000, 115%)
- **THEN** the card displays an over-budget status badge (`bg-[#FDEBEC] text-[#9F2F2D]`)
- **AND** the progress bar fill caps visually at 100% width using crimson fill (`#9F2F2D`)
- **AND** the headroom metric explicitly indicates the overrun as `"Melebihi batas Rp 750.000"` in Indonesian or `"Over limit by Rp 750,000"` in English
- **AND** the overrun amount renders in muted crimson (`#9F2F2D`).

### Requirement: Derived Savings Goals with Multi-Wallet Allocation
The planning studio SHALL display savings goals, tracking target amounts, accumulated savings (including foreign currency wallets converted into IDR via live pegs), days remaining to deadline, and a detailed breakdown of all underlying linked wallets and live conversion rates.

#### Scenario: View Sewa Rumah 2026 Goal Pacing
- **WHEN** user views the "Sewa Rumah 2026" goal
- **THEN** the interface displays target (Rp 18.000.000), current amount (Rp 14.230.897,52), progress percentage (79%), remaining days, and the exact contribution from BCA Pocket, Jago Sewa Rumah, OCBC, and Bitget USDT.

#### Scenario: View Multi-Currency Accumulated Goal Total
- **WHEN** user views the "Sewa Rumah 2026" goal
- **THEN** the total accumulated savings reflects the sum of all contributing IDR wallets plus the converted IDR value of foreign currency wallets (e.g. Bitget 115.61 USDT converted to Rp 2.061.999), matching the live total of Rp 14.230.897,52.

### Requirement: Obligations & Recurring Cashflow Templates
The planning studio SHALL display active liabilities (debts), receivables (loans), and recurring bill templates with scheduled next-run dates.

#### Scenario: View Debt Deadlines and Recurring Bills
- **WHEN** user views the Obligations tab
- **THEN** debts (e.g., Cicilan Yamaha Nmax, Istri) render with due dates, loans render with repayment expectations, and 13 recurring templates display frequency and upcoming debit dates.

### Requirement: Outbound Drilldown Links from Planning Entities to Filtered Ledger

The planning studio SHALL provide direct, interactive navigation links on budget cards, goal wallets, and recurring template rows that redirect users to pre-filtered ledger views.

#### Scenario: Budget Card Transaction Drilldown
- **WHEN** user clicks "Lihat Transaksi →" on a budget card (e.g. "Jenguk Rumah")
- **THEN** browser navigates to `/ledger` with `budgetId` and URL-encoded `budget` parameters
- **THEN** the target ledger view displays only transactions belonging to that specific budget

#### Scenario: Savings Goal Linked Wallet Drilldown
- **WHEN** user clicks a linked funding wallet on a savings goal card
- **THEN** browser navigates to `/ledger` with `walletId` pre-filtered to inspect transactions in that wallet

#### Scenario: Recurring Template / Liability Drilldown
- **WHEN** user clicks "Mutasi Terkait →" on a recurring template or obligation row
- **THEN** browser navigates to `/ledger` with a search keyword pre-filtered to locate realized transactions matching that recurring pattern

### Requirement: Category Studio & Matrix Workspace
The planning studio SHALL provide a 4th workspace sub-tab at `/planning` titled "Kategori", presenting an interactive matrix of all transaction categories with live aggregated nominal amounts, percentage shares of cashflow, transaction frequencies, and control filters.

#### Scenario: View Categorized Cashflow KPI Strip
- **WHEN** user selects the "Kategori" sub-tab on `/planning`
- **THEN** top KPI strip renders 3 summary tiles: Total Pengeluaran Terkategori (sum of expense transactions in active date window), Total Pemasukan Terkategori (sum of income transactions), and Kategori Terbesar (category with highest nominal and its percentage share).

#### Scenario: Real-time Date Horizon Aggregation
- **WHEN** user updates the date filter via `DateRangePicker` (e.g. from "Bulan Ini" to "Kuartal Ini" or custom date range)
- **THEN** all category nominals, transaction counts, and percentage shares immediately recompute based on transactions falling within the selected time window.

#### Scenario: Category Filtering and Sorting
- **WHEN** user types in search input or selects type filter (`Semua`, `Pengeluaran`, `Pemasukan`) or changes sorting (`Nominal Terbesar`, `Frekuensi Transaksi`, `Nama A-Z`)
- **THEN** the category list updates reactively to match the criteria without network reload.

#### Scenario: Grouped vs Flat View Modes
- **WHEN** user toggles between `Grouped` and `Flat` view
- **THEN** `Grouped` view displays separate sections for Pengeluaran and Pemasukan with subtotals, while `Flat` view displays a unified editorial ranked list.

### Requirement: Category Drilldown and Inspection
The planning studio SHALL provide deep drilldown capabilities into category transaction history and linkages to active budgets.

#### Scenario: Category Drawer Inspection
- **WHEN** user clicks a category row or card in the Category Studio
- **THEN** the system opens the side drawer displaying category summary, share of period spending track, linked budgets, and an embedded transaction table filtered to that category.

### Requirement: Category Management and Safety Safeguards
The system SHALL provide full CRUD operations for categories with safeguards protecting system-critical records.

#### Scenario: Create Category from Planning Studio
- **WHEN** user clicks "+ Tambah Kategori" in the Category Studio toolbar
- **THEN** the category form drawer opens allowing entry of category name, type (expense or income), and icon identifier.

#### Scenario: Quick-Add Category Inline within Transaction Form
- **WHEN** user clicks "+ Tambah Kategori Baru" in `TransactionFormDrawer`
- **THEN** the system triggers `categoryFormStore.openCreate()` with the current transaction type pre-selected, allowing instant category creation without leaving the form.

#### Scenario: Edit Category Metadata
- **WHEN** user clicks the edit button on a category row
- **THEN** the category form drawer opens pre-populated with the existing category name and icon.

#### Scenario: Delete Category with System Protection
- **WHEN** user attempts to delete the system category "Adjustment"
- **THEN** the delete action is disabled or rejected with an error message indicating that system categories cannot be deleted.

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

### Requirement: Savings Multi-Period Horizon Board View
The Planning Studio (`/planning`) SHALL provide a dedicated multi-period Horizon Board view specifically on the Goals (Savings) sub-tab to track chronological savings goal accumulation and monthly pacing.

#### Scenario: View Savings Goals Horizon Board
- **WHEN** user selects the `Goals` sub-tab at `/planning` and toggles view mode to `Horizon Board`
- **THEN** chronological monthly period columns are rendered for all active horizons
- **AND** each column displays progress cards for each savings goal showing:
  - Projected accumulated balance at that month-end horizon
  - Target amount and progress percentage
  - Milestone badge (`Tercapai!`) if the goal is projected to reach 100% in or before that month
  - Required monthly savings pacing figure.

#### Scenario: Goals List Mode Default
- **WHEN** user views the `Goals` sub-tab in `List` mode
- **THEN** standard horizontal goal cards are rendered with action buttons, status filters, and drawer drilldowns.

### Requirement: In-Memory Planning Studio Filter Persistence Across Navigation
Active sub-tab selections and status filters in the Planning studio SHALL persist in memory across page navigation until browser reload.

#### Scenario: Retain Active Planning Sub-Tab and Filters
- **WHEN** user selects a sub-tab (e.g. `Goals` or `Budgets`) and a lifecycle/period filter (e.g. `Lewat Tenggat` or `Riwayat Lampau`) on `/planning`
- **AND** navigates to `/ledger` and returns to `/planning`
- **THEN** the active sub-tab and the applied status filter remain active and undisturbed.
