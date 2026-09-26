# Proposal: Shadcn Skeleton Loading States & Cockpit Persistent Date Filter

## Why

Currently, when Maniyy V2 fetches live financial data from the Reedrich API, several components suffer from cumulative layout shift (CLS) or fall back to crude loading text (such as "Memuat transaksi..." with pulsing dots or blank card containers). In addition, while `/ledger`, `/accounts`, and `/planning` now share a unified, persistent date range filter via `dateFilterStore`, the Cockpit dashboard's "Mutasi Terkini" (`CockpitRecentLedger.svelte`) remains disconnected on its own isolated filter, fragmenting the user's analytical timeframe when jumping between Cockpit and the studio pages.

## What Changes

1. **Shadcn-Style Skeleton Primitive (`src/lib/components/ui/Skeleton.svelte`)**:
   - Implement a reusable, accessible Skeleton primitive with subtle pulse animation utilizing warm monochrome tokens (`bg-[#EAEAEA]` / `bg-[#F0EFEC]`) that strictly matches `minimalist-ui` guidelines.

2. **Full Skeleton Loading States Across API-Dependent Components**:
   - **Cockpit KPI Strip (`CockpitKpiStrip.svelte`)**: Display 4 skeleton metric cards matching the 2x2 mobile / 4-card desktop layout while `reedrichStore.isLoading` is true.
   - **Cockpit Bank Widget (`CockpitBankWidget.svelte`)**: Display skeleton institution balance tiles and allocation rows while loading.
   - **Cockpit Recent Ledger (`CockpitRecentLedger.svelte`)**: Display skeleton mutation rows matching the dense feed layout while transactions load.
   - **Cockpit Allocation Widget (`CockpitAllocationWidget.svelte`)**: Display skeleton cashflow distribution bars and active budget gauges.
   - **Ledger Studio (`src/routes/ledger/+page.svelte`)**: Replace the crude loading banner with structured skeleton table rows and summary strip indicators during `isLedgerLoading`.
   - **Akun & Bank (`src/routes/accounts/+page.svelte`)**: Render skeleton bank groups and wallet rows while initial snapshot loads.
   - **Perencanaan (`src/routes/planning/+page.svelte`)**: Render skeleton cards for budgets, goals, and obligations during initial loading.
   - **Drilldown Drawer (`DrawerTransactionTable.svelte`)**: Render skeleton table rows when `isDrawerLoading` is active.

3. **Persistent Date Range Filter in Cockpit Mutasi Terkini**:
   - Bind `CockpitRecentLedger.svelte` directly to `dateFilterStore` (`preset`, `startDate`, `endDate`), synchronizing date filtering seamlessly with `/ledger`, `/accounts`, and `/planning`.
   - Integrate `DateRangePicker` and one-click "Reset" button into the Mutasi Terkini header so users can adjust or reset the global horizon directly from the Cockpit.
   - Recompute filtered mutations reactively against `dateFilterStore.startDate` and `dateFilterStore.endDate`.

## Capabilities

### Modified Capabilities
- `account-dashboard`: Add skeleton loading states across Cockpit widgets and embed persistent date range filtering (`dateFilterStore`) into Mutasi Terkini.
- `ledger-studio`: Upgrade ledger loading presentation from plain text banner to structured skeleton tabular rows.

## Impact

- **Visual Quality**: Eliminates jarring layout shifts and blank states during API queries, creating a cohesive, high-end editorial feel (`minimalist-ui`).
- **User Consistency**: 100% unified date perspective across Cockpit, Ledger, Accounts, and Planning.
- **Accessibility**: Skeletons incorporate `aria-busy="true"` and `role="status"` semantics for screen readers.
