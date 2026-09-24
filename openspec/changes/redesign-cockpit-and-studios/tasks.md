# Tasks: Redesign Cockpit & Dedicated Studios Architecture

## 1. Design System & Typography Cleanup

- [ ] 1.1 Remove Newsreader serif font from `app.html` and `layout.css`, standardizing on Geist Sans and JetBrains Mono with `tabular-nums`
- [ ] 1.2 Remove drifting ambient blobs from `layout.svelte` and replace candy-colored badge pills with quiet semantic status dots
- [ ] 1.3 Update global Topbar navigation with links to the 4 studio routes: `/` (Cockpit), `/ledger` (Ledger), `/accounts` (Accounts), and `/planning` (Planning)

## 2. Executive Cockpit Dashboard (`/`)

- [ ] 2.1 Refactor `src/routes/+page.svelte` into a high-density Executive Cockpit containing executive KPI strip, critical runway alert banner, and 3-column operational workbench
- [ ] 2.2 Implement quick bank balances summary widget with direct link to accounts matrix
- [ ] 2.3 Implement recent transaction feed widget (latest 30 transactions) with quick link to full ledger studio
- [ ] 2.4 Implement monthly cashflow allocation widget showing top expense categories with progress bars

## 3. Super Dynamic Ledger Studio (`/ledger`)

- [ ] 3.1 Create `/ledger` route with full-width tabular transaction view displaying all transaction columns with proper alignment
- [ ] 3.2 Implement dynamic date range filter with presets (All, Today, This Month, Last Month, Last 3 Months) and custom date inputs
- [ ] 3.3 Implement multi-faceted filter controls: wallet multi-select grouped by bank, category multi-select, transaction types, status (realized/planned), and search input (`/` shortcut)
- [ ] 3.4 Implement live aggregate calculation strip (matching count, total income, total expense, net flow) updating reactively with any filter change
- [ ] 3.5 Implement pagination and sort controls for smooth navigation across hundreds of transactions

## 4. Bank & Account Matrix Studio (`/accounts`)

- [ ] 4.1 Create `/accounts` route grouping wallets hierarchically by financial institution
- [ ] 4.2 Compute and display automatic subtotals per bank in native currencies (IDR and USDT)
- [ ] 4.3 Implement spendable vs locked account breakdown with clean status indicators
- [ ] 4.4 Add 1-click "Lihat Mutasi" action navigating to `/ledger?walletId=...` with pre-applied filter

## 5. Financial Planning Studio (`/planning`)

- [ ] 5.1 Create `/planning` route with tabbed sub-workspaces for Budgets, Goals, and Obligations
- [ ] 5.2 Implement Budgets workspace showing limit utilization bars and warning states
- [ ] 5.3 Implement Goals workspace displaying derived multi-wallet contribution tables, conversion rates, and milestone countdowns
- [ ] 5.4 Implement Obligations workspace displaying debts, loan receivables, and 13 recurring transaction templates

## 6. Testing, Quality & Impeccable Verification

- [ ] 6.1 Update and expand Vitest unit tests in `src/lib/stores/reedrich.test.ts` for ledger filter engine and bank subtotals
- [ ] 6.2 Create Playwright E2E tests for multi-route navigation across `/`, `/ledger`, `/accounts`, and `/planning`
- [ ] 6.3 Create Playwright E2E tests for dynamic ledger filtering (date presets, search, bank selection)
- [ ] 6.4 Execute full test suite (`bun test` and `bunx playwright test`), `bun run check`, `bun run lint`, and verify all pass
