# Design

## Context

See `proposal.md` for user motivation and problem definition. Currently, categories are stored in `reedrichStore.categories` and supported by backend endpoints `POST`, `PATCH`, and `DELETE` at `/api/v1/categories`. Form drawer components (`CategoryFormContent.svelte`) and detail drawers (`CategoryDrawerContent.svelte`) exist in the codebase but lack a primary workbench view where users can explore, analyze, and manage them.

## Goals / Non-Goals

**Goals:**
- Provide a dedicated Category Studio workbench as the 4th tab on `/planning`.
- Compute dynamic, reactive cashflow totals (nominal expenditure, income, and transaction counts) aggregated across active date horizons (`dateFilterStore`).
- Provide high-density editorial controls: live search, type toggle, multi-criteria sorting, and grouped vs flat views.
- Deep drilldown into category mutasi via `CategoryDrawerContent` and direct ledger links.
- Enable full CRUD with `categoryFormStore` and inline quick-add inside `TransactionFormDrawer`.
- Ensure system safeguards for protected categories like `Adjustment`.

**Non-Goals:**
- Merging or migrating past transactions between categories (backend API does not support bulk category reassignments).
- Custom nested parent-child category hierarchies (the Reedrich API model operates on flat category records).

## Architecture & Component Hierarchy

```
routes/planning/+page.svelte
  └── (activeSubTab === 'categories')
        └── CategoryStudio.svelte
              ├── CategoryKpiStrip.svelte (Total Pengeluaran, Total Pemasukan, Kategori Terbesar)
              ├── CategoryControlsBar.svelte (Search, DateRangePicker, Type Toggle, Sort, View Toggle, + Tambah Kategori)
              └── CategoryList.svelte (Grouped by Type vs Flat List)
                    └── CategoryRowItem.svelte (Icon, Name, Transaction Count, Micro Allocation Bar, Formatted Amount, Actions)
```

## Svelte 5 Runes State & Metric Computation

```ts
interface CategoryStats {
  category: CategoryRecord;
  totalAmountIDR: number;
  transactionCount: number;
  percentageOfTotal: number;
  linkedBudget?: BudgetRecord;
}
```

1. **Aggregation Pipeline**:
   - Filter `reedrichStore.allTransactions` by `dateFilterStore.startDate` and `dateFilterStore.endDate`.
   - Aggregate sum of amounts (converted to IDR using wallet currency mapping) and transaction counts per `categoryId`.
   - Calculate total expense and total income across all categories in the window.
   - For expense categories, derive `percentageOfTotal = (catAmount / totalExpense) * 100`.

2. **Reactivity & Cache**:
   - Implemented using Svelte 5 `$derived.by()` memoized over `dateFilterStore.startDate`, `dateFilterStore.endDate`, `reedrichStore.allTransactions`, and `reedrichStore.categories`.

## Responsive Layout Strategy

- **Desktop (>= 1024px)**:
  - 3-column macro KPI strip (`grid-cols-3`).
  - Single-line horizontal filter toolbar with inline controls.
  - Category rows display name, linked budget chip, micro progress bar (120px fixed width), formatted monospace amount, and hover-triggered action buttons (`PencilSimple`, `Trash`).
- **Mobile (< 1024px)**:
  - 1-column stacked KPI strip (`grid-cols-1`).
  - Wrapping filter toolbar with full-width search input.
  - Micro progress bar placed below category title; action buttons always visible as compact icons.

## Data Contract & API Integration

- **List Categories**: `GET /api/v1/categories` -> `CategoryRecord[]`.
- **Create Category**: `POST /api/v1/categories` -> `{ name: string, type: 'expense' | 'income', icon?: string | null }`.
- **Update Category**: `PATCH /api/v1/categories/{id}` -> `{ name?: string, icon?: string | null }`.
- **Delete Category**: `DELETE /api/v1/categories/{id}`.
- All mutating actions call `await reedrichStore.invalidateAndRefresh()` to automatically synchronize category dropdowns across the application.

## Testing Strategy

- **Unit Tests (`apps/web/src/lib/utils/category-metrics.test.ts`)**:
  - Verify correct aggregation of multi-currency transactions into IDR per category within date range.
  - Verify handling of categories with zero transactions (retaining 0 nominal and 0% share).
  - Verify sorting algorithms (`balance_desc`, `count_desc`, `name_asc`).
- **Component Tests / Smoke Verification**:
  - Test sub-tab switching on `/planning`.
  - Test create category workflow via `CategoryFormContent`.
  - Test system category protection preventing deletion of `Adjustment`.
