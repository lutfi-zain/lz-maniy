# Spec Delta

## MODIFIED Requirements

### Requirement: Transaction Type Switching
The form SHALL support three transaction types through a type switcher control, exposing planning controls uniformly across all transaction types.

#### Scenario: Switch to Expense Type
- **WHEN** user selects `Pengeluaran` in the type switcher
- **THEN** the form shows: source wallet selector, category selector, amount, admin fee, date, description, planned checkbox, and optional budget selector

#### Scenario: Switch to Income Type
- **WHEN** user selects `Pemasukan` in the type switcher
- **THEN** the form shows: destination wallet selector, category selector, amount, admin fee, date, description, and planned checkbox
- **THEN** budget selector is hidden

#### Scenario: Switch to Transfer Type
- **WHEN** user selects `Transfer` in the type switcher
- **THEN** the form shows: source wallet selector, target wallet selector, category selector (optional), amount, admin fee, date, description, and planned checkbox
- **THEN** budget selector is hidden

#### Scenario: Preserve Field Values on Type Switch
- **WHEN** user switches transaction type after filling some fields
- **THEN** shared fields (amount, description, date) retain their values
- **THEN** type-specific fields reset to their defaults

### Requirement: Create Transaction
The form SHALL create new transactions by calling the appropriate Reedrich API endpoint, supporting both realized and planned fund transfers.

#### Scenario: Submit New Expense
- **WHEN** user fills required fields (wallet, category, amount) and clicks `Simpan` with type `Pengeluaran`
- **THEN** a `POST /api/v1/transactions` request is sent with `type: "expense"` and the filled field values
- **THEN** on success, the drawer closes, a success notification is shown, and the ledger and dashboard data refresh

#### Scenario: Submit New Income
- **WHEN** user fills required fields and clicks `Simpan` with type `Pemasukan`
- **THEN** a `POST /api/v1/transactions` request is sent with `type: "income"`

#### Scenario: Submit New Transfer
- **WHEN** user fills required fields (source wallet, target wallet, amount) and clicks `Simpan` with type `Transfer`
- **THEN** a `POST /api/v1/transfers` request is sent with `sourceWalletId`, `targetWalletId`, `amount`, and `isPlanned` (boolean)
- **THEN** on success, if `isPlanned` is false, wallet balances for both source and target wallets are updated; if `isPlanned` is true, wallet balances remain unchanged

#### Scenario: Validation Error
- **WHEN** user submits the form with missing required fields (empty wallet, empty category for expense/income, or zero/negative amount)
- **THEN** inline validation messages appear on the offending fields and the form does not submit

#### Scenario: Server Error on Create
- **WHEN** the API returns a 400 or 500 error after submission
- **THEN** the form remains open, displays the error message from the API response, and retains all user input

## ADDED Requirements

### Requirement: Transfer Planning Status Editing
The drawer SHALL allow toggling the planning status of existing transfer transactions between planned and realized states.

#### Scenario: Realize Planned Transfer via Form Edit
- **WHEN** user edits an existing transfer that has `transactionIsPlanned: 1`, unchecks the planned checkbox, and submits the form
- **THEN** a `PATCH /api/v1/transactions/{id}` request is sent containing `isPlanned: false`
- **THEN** on success, the backend atomically realizes the transfer, balances are updated across source and target wallets, and the UI reflects the realized status
