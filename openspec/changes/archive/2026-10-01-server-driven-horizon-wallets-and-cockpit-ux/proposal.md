# Proposal

## Why

In the recent Reedrich v1.15.0 update, backend support was added for server-driven point-in-time wallet snapshots (`GET /api/v1/wallets?startDate=...&endDate=...&filter=...`) and structured multi-period horizon parameters (`filter=realized|planned|all`). 

Currently, the Maniyy V2 web frontend suffers from three distinct user experience and architectural issues:
1. **Broken Date Filtering in Account & Banking**: The `/accounts` page attempted client-side point-in-time reconciliation using `reedrichStore.allTransactions`, which was emptied in commit `08cfee1` to stop unbounded while-loops. Consequently, changing the date filter has zero effect on wallet balances or macro KPI tiles.
2. **Cockpit Friction & Redirection Violations**: Cockpit transactions lack click-to-view interaction (rendering static unclickable table rows instead of opening the transaction detail drawer), bank cards jump away to `/ledger` instead of opening the wallet drawer, and the transaction query does not enforce `status=realized` or explicit descending date ordering.
3. **Hardcoded Limits Without Pagination**: Multiple views (e.g., `HorizonPeriodColumn` and `DrawerTransactionTable`) query with a hardcoded `limit: 50` without pagination controls or infinite scrolling, silently truncating transactions for high-activity periods and accounts.

Upgrading these components resolves calculation inaccuracies, adheres to minimalist-ui interaction protocols, and ensures robust server-driven data fetching across the entire workbench.

## What Changes

- **Server-Driven Wallet Snapshot (`GET /api/v1/wallets`)**:
  - Update `reedrichStore.fetchWallets()` to accept `startDate`, `endDate`, and `filter` query parameters.
  - Wire reactive synchronization in `/accounts` so changing `dateFilterStore` triggers a server-driven wallet re-fetch, eliminating the dead client-side `allTransactions` fallback.
- **Cockpit Workbench UX Refinements**:
  - Update `CockpitRecentLedger` query to include `status: 'realized'`, `orderBy: 'date'`, `direction: 'desc'`, and `limit: 30`.
  - Add interactive row clicks on `CockpitRecentLedger` items to open the transaction detail/edit drawer (`transactionFormStore.openView(tx)`).
  - Update `CockpitBankWidget` account clicks to open `WalletDrawerContent` via `reedrichStore.openDrawer({ type: 'wallet', ... })` rather than navigating away to `/ledger`.
- **Horizon & Drawer Pagination Architecture**:
  - Add pagination / "Muat Lebih Banyak" (load more) capability to `HorizonPeriodColumn` so periods with >50 transactions can stream subsequent pages without truncation.
  - Add responsive pagination controls to `DrawerTransactionTable` leveraging `TransactionEnvelope.pagination` (`limit`, `offset`, `hasNext`, `total`).
- **Shared Types & Client Store Expansion**:
  - Add `orderBy` (`'date' | 'amount' | 'createdAt' | 'description'`) and `direction` (`'asc' | 'desc'`) to `TransactionQueryParams` in `@maniyy/shared`.
  - Add `startDate`, `endDate`, and `filter` query parameters to `fetchWallets` in `ReedrichStore`.

## Capabilities

### Modified Capabilities
- `account-dashboard`: Enhance wallet listing and account KPI calculations to use server-driven snapshot filtering via `GET /api/v1/wallets?startDate=...&endDate=...&filter=...`.
- `drilldown-drawer`: Add pagination state and controls to `DrawerTransactionTable` to prevent hardcoded 50-item truncation.
- `ledger-studio`: Update `HorizonPeriodColumn` to support paginated transaction loading and eliminate hardcoded 50-limit truncation.
- `financial-store`: Extend `fetchWallets` and `TransactionQueryParams` to support point-in-time wallet snapshots and transaction sorting flags.

## Impact

- **Frontend (`apps/web`)**:
  - `src/lib/stores/reedrich.svelte.ts`: updated `fetchWallets` signature and parameters; query builder supports `orderBy` and `direction`.
  - `src/lib/components/cockpit/CockpitRecentLedger.svelte`: interactive row click opens transaction view drawer; query sends `status=realized`, `orderBy=date`, `direction=desc`.
  - `src/lib/components/cockpit/CockpitBankWidget.svelte`: clicking wallet rows opens `WalletDrawerContent` instead of redirecting to `/ledger`.
  - `src/routes/accounts/+page.svelte`: reactively calls `reedrichStore.fetchWallets({ startDate, endDate })` when date filter changes.
  - `src/lib/components/ledger/HorizonPeriodColumn.svelte`: supports paginated transaction loading (load more).
  - `src/lib/components/drawer/DrawerTransactionTable.svelte`: supports pagination controls.
- **Shared Package (`packages/shared`)**:
  - `src/account-detail.ts`: updated `TransactionQueryParams` interface with `orderBy` and `direction`.
