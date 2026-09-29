# Tasks

## 1. Metrics Calculation & Utility Helpers
- [x] 1.1 Create `category-metrics.ts` in `apps/web/src/lib/utils/` to aggregate transactions into category stats (nominal sum in IDR, transaction counts, percentage share, and linked budgets) within a date range.
- [x] 1.2 Implement category sorting algorithms (`balance_desc`, `count_desc`, `name_asc`) in `category-metrics.ts`.
- [x] 1.3 Write comprehensive unit tests in `apps/web/src/lib/utils/category-metrics.test.ts` covering multi-currency conversions, zero-transaction categories, and sorting behaviors.

## 2. Category Studio UI Components

- [x] 2.1 Create `CategoryKpiStrip.svelte` in `apps/web/src/lib/components/category/` rendering 3 responsive summary tiles (Total Pengeluaran, Total Pemasukan, and Kategori Terbesar) with monospace figures.
- [x] 2.2 Create `CategoryControlsBar.svelte` with search query input, `DateRangePicker`, type toggle (`Semua`, `Pengeluaran`, `Pemasukan`), sort dropdown, view mode toggle (`grouped` vs `flat`), and `+ Tambah Kategori` action button.
- [x] 2.3 Create `CategoryRowItem.svelte` with Phosphor icon badge, category title, budget link indicator, micro percentage bar, monospace amount, and hover action buttons (`PencilSimple`, `Trash`).
- [x] 2.4 Create `CategoryStudio.svelte` uniting the KPI strip, controls bar, and list view with skeleton loading states matching `minimalist-ui` standards.

## 3. Planning Page Integration & Quick-Add Feature

- [x] 3.1 Update `apps/web/src/routes/planning/+page.svelte` to add `categories` as the 4th workspace sub-tab with count badge and mount `CategoryStudio.svelte`.
- [x] 3.2 Update `CategoryDrawerContent.svelte` to ensure seamless transaction drilldown and edit/delete actions initiated from the new studio rows.
- [x] 3.3 Add inline `+ Tambah Kategori Baru` action link next to the category label in `TransactionFormDrawer.svelte` to trigger `categoryFormStore.openCreate()` with pre-selected type.

## 4. Verification & Validation

- [x] 4.1 Verify safety safeguards preventing the deletion of system-protected category `Adjustment`.
- [x] 4.2 Run unit test suites with `bun run --cwd apps/web test` and verify all tests pass.
- [x] 4.3 Run typecheck and static build verification with `bun run --cwd apps/web check && bun run --cwd apps/web build`.
