# Tasks


- [x] 1.1 Update `TransactionQueryParams` in `packages/shared/src/account-detail.ts` to include `orderBy?: 'date' | 'amount' | 'createdAt' | 'description'` and `direction?: 'asc' | 'desc'`.
- [x] 1.2 Update `reedrichStore.fetchTransactions` in `apps/web/src/lib/stores/reedrich.svelte.ts` to append `orderBy` and `direction` query parameters when provided.
- [x] 1.3 Update `reedrichStore.fetchWallets` in `apps/web/src/lib/stores/reedrich.svelte.ts` to accept `{ startDate?: string; endDate?: string; filter?: 'realized' | 'planned' | 'all'; isLocked?: boolean }` and append them to `/api/v1/wallets`.
- [x] 1.4 Add unit tests in `apps/web/src/lib/stores/reedrich.test.ts` for parameterized `fetchWallets` and sorted `fetchTransactions`.

## 2. Server-Driven Account & Banking Integration

- [x] 2.1 Refactor `apps/web/src/routes/accounts/+page.svelte` to invoke `reedrichStore.fetchWallets({ startDate, endDate })` when `dateFilterStore` changes.
- [x] 2.2 Update wallet balance resolution in `apps/web/src/routes/accounts/+page.svelte` to use the server-returned wallet balances and update macro KPI cards accordingly.
- [x] 2.3 Verify `bun run test:web` passes for account filtering behavior.

## 3. Cockpit Workbench UX & Redirection Polish

- [x] 3.1 Update `CockpitRecentLedger.svelte` query to supply `status: 'realized'`, `orderBy: 'date'`, `direction: 'desc'`, and `limit: 30`.
- [x] 3.2 Add click handlers to transaction rows in `CockpitRecentLedger.svelte` to trigger `transactionFormStore.openView(tx)`.
- [x] 3.3 Update `CockpitBankWidget.svelte` sub-wallet rows to trigger `reedrichStore.openDrawer({ type: 'wallet', ... })` and fetch drawer transactions instead of navigating to `/ledger`.

## 4. Horizon Column & Drawer Pagination Architecture

- [x] 4.1 Update `HorizonPeriodColumn.svelte` to track `offset` and render a minimalist "Muat Lebih Banyak" action button when `hasNext === true`.
- [x] 4.2 Update `DrawerTransactionTable.svelte` to render pagination controls (`< Prev | Page X of Y | Next >`) bound to `TransactionEnvelope.pagination`.
- [x] 4.3 Update `reedrichStore.fetchTransactionsForDrawer` to support `offset` pagination and caching by page.

## 5. Verification & End-to-End Validation

- [x] 5.1 Run full unit test suite with `bun run test:web` and type checking with `bun run check:web`.
- [x] 5.2 Create and execute a Playwright test verifying date filter updates in `/accounts`, Cockpit drawer clicks, and pagination controls.
