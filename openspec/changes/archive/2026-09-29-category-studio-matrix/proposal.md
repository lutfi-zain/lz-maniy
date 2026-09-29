# Proposal

## Why

While Reedrich API provides full CRUD capabilities for categories (`/api/v1/categories`), the Maniyy frontend currently only references categories inside form dropdowns and ledger filters without a dedicated management view or financial analysis surface. Users cannot view total expenditure per category across custom date ranges, compare category allocation shares, or manage categories (create, edit, delete) in an intuitive, interactive cockpit. 

Adopting the high-density editorial design of Akun & Bank (`/accounts`) as a 4th tab on `/planning` transforms Category Management into an informative, interactive Category Studio with live cashflow nominals, time-horizon filtering, drilldown analytics, and complete CRUD operations.

## What Changes

- Add a 4th workspace sub-tab to `/planning`: **Kategori** (`categories`), alongside Target Tabungan, Pagu Anggaran, and Kewajiban & Rutin.
- **Top Macro KPI Strip**: 3 summary tiles calculating total categorized expense, total categorized income, and dominant expense category (% share and nominal) reactive to `dateFilterStore`.
- **Category Filter & Controls Toolbar**:
  - Live text search across category names.
  - Integration with `DateRangePicker` for point-in-time cashflow evaluation.
  - Category type filter toggle (`Semua`, `Pengeluaran`, `Pemasukan`).
  - Multi-criteria sorting (`Nominal Terbesar`, `Frekuensi Transaksi`, `Nama A-Z`).
  - View mode toggle (`Grouped` by type vs `Flat` dense list).
  - Primary CTA button `+ Tambah Kategori` to trigger `categoryFormStore.openCreate()`.
- **Editorial Category Cards / Table**:
  - Clear typography with Phosphor icon badge, category title, transaction count, and linked budget indicator.
  - Inline micro allocation bar displaying percentage share of total period expenditure.
  - Tabular monetary amounts formatted with Geist Mono.
  - Hover action toolbar featuring `PencilSimple` (edit category) and `Trash` (delete with confirmation modal).
  - System-protected badge on `Adjustment` category preventing deletion.
  - Row click interaction opening `reedrichStore.openDrawer({ type: 'category' })` with `CategoryDrawerContent.svelte` drilldown.
- **Quick-Add in Transaction Form**:
  - Add quick action link `+ Tambah Kategori Baru` directly next to the category label in `TransactionFormDrawer.svelte` to allow inline creation without navigating away.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `planning-studio`: Extend `/planning` with the 4th workbench sub-tab for interactive Category Studio & Matrix, supporting real-time cashflow metric aggregation, sorting, filtering, and drawer drilldowns.
- `entity-crud`: Extend category CRUD capabilities to ensure inline creation within transaction drawer, full editing, and deletion with system-protected safeguards.

## Impact

- Frontend: `apps/web/src/routes/planning/+page.svelte`, `apps/web/src/lib/components/drawer/CategoryDrawerContent.svelte`, `apps/web/src/lib/components/drawer/CategoryFormContent.svelte`, `apps/web/src/lib/components/transaction/TransactionFormDrawer.svelte`.
- State Stores: `apps/web/src/lib/stores/reedrich.svelte.ts`, `apps/web/src/lib/stores/category-form.svelte.ts`.
- Backend/API: No backend changes required; `/api/v1/categories` endpoints are already live and operational on Reedrich API.
