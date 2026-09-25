# transaction-crud Specification

## Purpose
Provides full Create, Read (detail view), Update, and Delete operations for financial transactions (expense, income, transfer) via the Reedrich REST API, with a globally accessible slide-over form drawer, type-switching conditional fields, and post-mutation state reconciliation.

## ADDED Requirements

### Requirement: Global Form Accessibility
The transaction form drawer SHALL be accessible from any authenticated route.

#### Scenario: Open New Transaction from Topbar
- **WHEN** user clicks the `[+ Catat]` button in the Topbar on desktop (>= 768px)
- **THEN** the transaction form drawer slides in from the right in create mode with type defaulting to `Pengeluaran` (expense)

#### Scenario: Open New Transaction from BottomNav
- **WHEN** user taps the center action button in the BottomNav on mobile (< 768px)
- **THEN** the transaction form drawer slides in from the right in create mode with type defaulting to `Pengeluaran` (expense)

#### Scenario: Open New Transaction via Keyboard Shortcut
- **WHEN** user presses `N` and no text input, textarea, or contenteditable element has focus
- **THEN** the transaction form drawer opens in create mode

#### Scenario: Dismiss Form Drawer
- **WHEN** the form drawer is open and the user presses `Escape`, clicks the backdrop, or clicks the close button
- **THEN** the drawer closes and any unsaved changes are discarded without confirmation

---

### Requirement: Transaction Type Switching
The form SHALL support three transaction types through a type switcher control.

#### Scenario: Switch to Expense Type
- **WHEN** user selects `Pengeluaran` in the type switcher
- **THEN** the form shows: source wallet selector, category selector, amount, admin fee, date, description, planned checkbox, and optional budget selector

#### Scenario: Switch to Income Type
- **WHEN** user selects `Pemasukan` in the type switcher
- **THEN** the form shows: destination wallet selector, category selector, amount, admin fee, date, description, and planned checkbox
- **THEN** budget selector is hidden

#### Scenario: Switch to Transfer Type
- **WHEN** user selects `Transfer` in the type switcher
- **THEN** the form shows: source wallet selector, target wallet selector, category selector (optional), amount, admin fee, date, and description
- **THEN** planned checkbox and budget selector are hidden

#### Scenario: Preserve Field Values on Type Switch
- **WHEN** user switches transaction type after filling some fields
- **THEN** shared fields (amount, description, date) retain their values
- **THEN** type-specific fields reset to their defaults

---

### Requirement: Create Transaction
The form SHALL create new transactions by calling the appropriate Reedrich API endpoint.

#### Scenario: Submit New Expense
- **WHEN** user fills required fields (wallet, category, amount) and clicks `Simpan` with type `Pengeluaran`
- **THEN** a `POST /api/v1/transactions` request is sent with `type: "expense"` and the filled field values
- **THEN** on success, the drawer closes, a success notification is shown, and the ledger and dashboard data refresh

#### Scenario: Submit New Income
- **WHEN** user fills required fields and clicks `Simpan` with type `Pemasukan`
- **THEN** a `POST /api/v1/transactions` request is sent with `type: "income"`

#### Scenario: Submit New Transfer
- **WHEN** user fills required fields (source wallet, target wallet, amount) and clicks `Simpan` with type `Transfer`
- **THEN** a `POST /api/v1/transfers` request is sent with `sourceWalletId`, `targetWalletId`, and `amount`
- **THEN** on success, wallet balances for both source and target wallets are updated

#### Scenario: Validation Error
- **WHEN** user submits the form with missing required fields (empty wallet, empty category for expense/income, or zero/negative amount)
- **THEN** inline validation messages appear on the offending fields and the form does not submit

#### Scenario: Server Error on Create
- **WHEN** the API returns a 400 or 500 error after submission
- **THEN** the form remains open, displays the error message from the API response, and retains all user input

---

### Requirement: View Transaction Detail
The drawer SHALL display a read-only detail view of an existing transaction.

#### Scenario: Open Transaction Detail from Ledger Row
- **WHEN** user clicks a transaction row in the Ledger table or mobile feed
- **THEN** the drawer opens in view mode showing: transaction date, description, category name, wallet name(s), amount (with currency), admin fee, type badge, planned/realized status, and budget name (if linked)

#### Scenario: Transfer Transaction Detail
- **WHEN** the viewed transaction has `transactionType: "transfer"` and a non-null `transactionTargetWalletId`
- **THEN** the detail view shows both source and target wallet names with a directional indicator

---

### Requirement: Edit Transaction
The drawer SHALL support editing existing transactions.

#### Scenario: Enter Edit Mode
- **WHEN** user clicks `[Edit]` in the detail view
- **THEN** the drawer transitions to edit mode, populating the form fields with the transaction's current values and setting the type switcher to match

#### Scenario: Save Edit
- **WHEN** user modifies fields and clicks `Simpan` in edit mode
- **THEN** a `PATCH /api/v1/transactions/{transactionId}` request is sent with only the changed fields
- **THEN** on success, the drawer reverts to view mode showing updated values, and ledger and dashboard data refresh

#### Scenario: Cancel Edit
- **WHEN** user clicks `Batal` or presses `Escape` during edit mode
- **THEN** the drawer reverts to view mode without sending any API request

#### Scenario: Edit Transfer Transaction
- **WHEN** user edits a transaction with `transactionType: "transfer"`
- **THEN** the type switcher is locked to `Transfer` and cannot be changed (transfer transactions cannot be reclassified via PATCH)

---

### Requirement: Delete Transaction
The drawer SHALL support deleting transactions with explicit confirmation.

#### Scenario: Confirm Delete
- **WHEN** user clicks `[Hapus]` in the detail view
- **THEN** a confirmation dialog appears with the message including the transaction description and amount

#### Scenario: Execute Delete
- **WHEN** user confirms the delete action
- **THEN** a `DELETE /api/v1/transactions/{transactionId}` request is sent
- **THEN** on success, the drawer closes, a success notification is shown, and the ledger and dashboard data refresh (wallet balance reversed automatically by backend)

#### Scenario: Cancel Delete
- **WHEN** user dismisses the confirmation dialog
- **THEN** no API request is sent and the drawer remains in view mode

---

### Requirement: Post-Mutation State Reconciliation
After any successful create, update, or delete mutation, the application state SHALL be refreshed to reflect backend-computed changes.

#### Scenario: Refresh After Mutation
- **WHEN** a create, update, or delete transaction completes successfully
- **THEN** `fetchSnapshot()` is called to refresh wallet balances, cashflow, budgets, goals, and obligations
- **THEN** `fetchAllTransactions()` is called to refresh the full ledger dataset
- **THEN** the transaction cache is invalidated for affected wallets and categories
