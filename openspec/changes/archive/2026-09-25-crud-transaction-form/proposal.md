# Proposal: CRUD Transaction Form

## Why

Maniyy V2 is currently 100% read-only — users can view transactions, wallets, budgets, and goals fetched from the Reedrich API, but cannot create, edit, or delete any financial data from the frontend. The Reedrich API (v1.x) exposes full CRUD endpoints for transactions (`GET`, `POST`, `PATCH`, `DELETE /api/v1/transactions/{id}`) and atomic wallet-to-wallet transfers (`POST /api/v1/transfers`), but no frontend surface consumes them. Users must rely on external tools or direct API calls to manage their financial records.

## What Changes

1. **Global Transaction Form Drawer**:
   - Implement a slide-over drawer component (`TransactionFormDrawer`) mounted globally in `+layout.svelte`, accessible from any route (`/`, `/ledger`, `/accounts`, `/planning`).
   - Desktop: `[+ Catat]` button added to the Topbar's right section, always visible when authenticated.
   - Mobile: Center action button embedded in `BottomNav` between the Ledger and Akun tabs, opening the same form drawer.
   - Keyboard shortcut `N` opens the new transaction form from any route (when no input/textarea is focused).

2. **Transaction Type Switcher (ToggleGroup)**:
   - The form features a three-way ToggleGroup at the top: `Pengeluaran` (expense) / `Pemasukan` (income) / `Transfer`.
   - Switching type conditionally reveals/hides fields: transfer shows two wallet pickers and hides `isPlanned`; expense shows budgetId selector; income hides budgetId.
   - Transfer type routes to `POST /api/v1/transfers` instead of `POST /api/v1/transactions`.

3. **Transaction Detail View + Edit Mode**:
   - Clicking a transaction row in the Ledger opens the drawer in **view mode** showing all transaction metadata in a read-only detail layout.
   - View mode offers `[Edit]` and `[Hapus]` action buttons.
   - `[Edit]` toggles the drawer into **edit mode**, populating the same form with current values and calling `PATCH /api/v1/transactions/{id}` on save.
   - `[Hapus]` triggers a confirmation dialog (`AlertDialog`) before calling `DELETE /api/v1/transactions/{id}`.

4. **Store Mutation Methods (`reedrichStore`)**:
   - Add `createTransaction()`, `updateTransaction()`, `deleteTransaction()`, `createTransfer()` methods to `ReedrichStore`.
   - Each mutation method calls the respective Reedrich API endpoint using the existing `request()` pipeline (with Bearer token, proactive refresh, 401 retry).
   - After successful mutation, invalidate transaction cache, re-fetch `allTransactions`, and re-fetch `snapshot` (for updated wallet balances, cashflow, budget utilization).

5. **Post-Mutation State Reconciliation**:
   - Creating/editing/deleting a transaction triggers `fetchSnapshot()` + `fetchAllTransactions()` to ensure wallet balances, cashflow summaries, budget utilization, and the ledger view are all consistent with the backend.

## Capabilities

### New Capabilities

- `transaction-crud`: Full Create, Read (detail view), Update, and Delete operations for financial transactions (expense, income, transfer) via the Reedrich REST API, with a globally accessible slide-over form drawer, type-switching conditional fields, and post-mutation state reconciliation.

### Modified Capabilities

- `financial-store`: Add mutation methods (`createTransaction`, `updateTransaction`, `deleteTransaction`, `createTransfer`) to `ReedrichStore`, extending it from read-only to read-write.
- `drilldown-drawer`: Extend drawer types to support `transaction-detail` (view mode) and `transaction-form` (create/edit mode) alongside existing entity drilldowns.
- `ledger-studio`: Add click handler to transaction rows to open the transaction detail drawer. Add `[+ Catat]` header action on desktop.
- `account-dashboard`: Add `[+ Catat]` trigger to Topbar (desktop) and center action button to BottomNav (mobile).
