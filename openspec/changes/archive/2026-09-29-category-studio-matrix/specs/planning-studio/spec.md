# Spec Delta

## ADDED Requirements

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
