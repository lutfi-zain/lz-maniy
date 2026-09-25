# Tasks

## 1. Budget Filtering Engine in Ledger Studio

- [x] 1.1 Add `selectedBudgetIds` filter state, `budgetId` and `budget` URL query param parsing, and active budget dismissible chip in `src/routes/ledger/+page.svelte`
- [x] 1.2 Implement budget filtering in `filteredTransactions` matching `t.transactionBudgetId` and category fallback
- [x] 1.3 Add Searchable Multi-Select Budget Combobox in Row 2 of the Ledger filter controls bar
- [x] 1.4 Render resolved budget tag badge in desktop table rows and mobile feed cards
- [x] 1.5 Add unit tests in `src/lib/utils/budget-filter.test.ts` validating budget matching and fallback logic

## 2. Cross-Studio Planning Drilldown Actions

- [x] 2.1 Update `BudgetCard.svelte` with interactive "Lihat Transaksi →" action link redirecting to `/ledger?budgetId=...`
- [x] 2.2 Update savings goal linked wallet chips in `src/routes/planning/+page.svelte` to link to `/ledger?walletId=...`
- [x] 2.3 Update recurring template items in `src/routes/planning/+page.svelte` with "Mutasi Terkait →" drilldown links

## 3. Automated Quality Verification & Production Build

- [x] 3.1 Create Playwright E2E test in `tests/planning-drilldown.spec.ts` validating budget drilldown from planning to ledger and filter chip clearing
- [x] 3.2 Execute full test suite (`bun run test:unit && bun run test:e2e`)
- [x] 3.3 Run type checker and linter (`bun run check && bun run lint`) and verify 0 errors and 0 warnings
- [x] 3.4 Build static production bundle (`bun run build`)
