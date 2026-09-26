# Tasks

## 1. Shadcn Skeleton Primitive & Unit Tests

- [x] 1.1 Create `src/lib/components/ui/Skeleton.svelte` adhering to shadcn-svelte patterns with warm monochrome pulse styling
- [x] 1.2 Add unit tests in `src/lib/components/ui/Skeleton.test.ts` verifying accessibility attributes (`role="status"`, `aria-label`) and class merge

## 2. Cockpit Persistent Date Range Filter

- [x] 2.1 Update `CockpitRecentLedger.svelte` to bind `DateRangePicker` directly to `dateFilterStore` and add an inline Reset button
- [x] 2.2 Wire reactive mutation filtering in `CockpitRecentLedger.svelte` using `dateFilterStore.startDate` and `dateFilterStore.endDate`

## 3. Skeleton States Across Components

- [x] 3.1 Implement skeleton loading states in Cockpit widgets (`CockpitKpiStrip.svelte`, `CockpitBankWidget.svelte`, `CockpitRecentLedger.svelte`, and `CockpitAllocationWidget.svelte`)
- [x] 3.2 Implement structured skeleton table rows and summary strip in Ledger Studio (`src/routes/ledger/+page.svelte`)
- [x] 3.3 Implement skeleton placeholders in Akun & Bank (`src/routes/accounts/+page.svelte`), Perencanaan (`src/routes/planning/+page.svelte`), and `DrawerTransactionTable.svelte`

## 4. Automated Quality Verification & Production Build

- [x] 4.1 Create Playwright E2E test in `tests/cockpit-date-filter.spec.ts` verifying Cockpit date synchronization and reset behavior
- [x] 4.2 Execute full test suite (`bun run test:unit && bun run test:e2e`)
- [x] 4.3 Run type checker and linter (`bun run check && bun run lint`) and verify 0 errors and 0 warnings
- [x] 4.4 Build static production bundle (`bun run build`)
