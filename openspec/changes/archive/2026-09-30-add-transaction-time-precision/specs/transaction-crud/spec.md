# Spec Delta

## MODIFIED Requirements

### Requirement: Transaction Type Switching
The form SHALL support three transaction types through a type switcher control.

#### Scenario: Switch to Expense Type
- **WHEN** user selects `Pengeluaran` in the type switcher
- **THEN** the form shows: source wallet selector, category selector, amount, admin fee, date, time (jam:menit), description, planned checkbox, and optional budget selector

#### Scenario: Switch to Income Type
- **WHEN** user selects `Pemasukan` in the type switcher
- **THEN** the form shows: destination wallet selector, category selector, amount, admin fee, date, time (jam:menit), description, and planned checkbox
- **THEN** budget selector is hidden

#### Scenario: Switch to Transfer Type
- **WHEN** user selects `Transfer` in the type switcher
- **THEN** the form shows: source wallet selector, target wallet selector, category selector (optional), amount, admin fee, date, time (jam:menit), and description
- **THEN** planned checkbox and budget selector are hidden

#### Scenario: Preserve Field Values on Type Switch
- **WHEN** user switches transaction type after filling some fields
- **THEN** shared fields (amount, description, date, time) retain their values
- **THEN** type-specific fields reset to their defaults

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

#### Scenario: Time Input Visible on Create
- **WHEN** the drawer opens in create mode (any of the three types)
- **THEN** a time input (jam:menit) is shown next to the date picker, pre-filled with the current local time
- **THEN** the user MAY change the time or leave the pre-filled value

#### Scenario: Submit Sends Full Datetime
- **WHEN** user submits the create form with date `D` and time `HH:mm`
- **THEN** the `date` field in the POST payload is a full ISO datetime with local offset (`DTHH:mm:00±HH:MM`), not a date-only string
- **THEN** seconds are always `:00`

#### Scenario: Validation Error
- **WHEN** user submits the form with missing required fields (empty wallet, empty category for expense/income, or zero/negative amount)
- **THEN** inline validation messages appear on the offending fields and the form does not submit

#### Scenario: Invalid Time Blocks Submit
- **WHEN** user submits the form with an empty or malformed time value
- **THEN** an inline validation message appears on the time field and the form does not submit

#### Scenario: Server Error on Create
- **WHEN** the API returns a 400 or 500 error after submission
- **THEN** the form remains open, displays the error message from the API response, and retains all user input

### Requirement: View Transaction Detail
The drawer SHALL display a read-only detail view of an existing transaction.

#### Scenario: Open Transaction Detail from Ledger Row
- **WHEN** user clicks a transaction row in the Ledger table or mobile feed
- **THEN** the drawer opens in view mode showing: transaction date with time, description, category name, wallet name(s), amount (with currency), admin fee, type badge, planned/realized status, and budget name (if linked)

#### Scenario: Transaction Time Shown in Detail
- **WHEN** the viewed transaction has a `transactionDate` with a non-midnight time component
- **THEN** the Tanggal row shows date plus time (`30 Sep 2026 · 14:30`), with the time portion visually de-emphasized relative to the date

#### Scenario: Legacy Date-Only Transaction Hides Time
- **WHEN** the viewed transaction has a `transactionDate` at exactly midnight (`00:00`) or a date-only value (legacy data recorded before time precision existed)
- **THEN** the Tanggal row shows only the date with no time portion

#### Scenario: Transfer Transaction Detail
- **WHEN** the viewed transaction has `transactionType: "transfer"` and a non-null `transactionTargetWalletId`
- **THEN** the detail view shows both source and target wallet names with a directional indicator

### Requirement: Edit Transaction
The drawer SHALL support editing existing transactions.

#### Scenario: Enter Edit Mode
- **WHEN** user clicks `[Edit]` in the detail view
- **THEN** the drawer transitions to edit mode, populating the form fields with the transaction's current values (including date AND time parsed from the transaction's datetime) and setting the type switcher to match

#### Scenario: Edit Mode Preserves Original Time
- **WHEN** the edited transaction has a `transactionDate` with a time component
- **THEN** the time input is pre-filled with that transaction's time, not the current time

#### Scenario: Legacy Transaction Defaults Time to Midnight
- **WHEN** the edited transaction has a date-only `transactionDate` (no time component)
- **THEN** the time input is pre-filled with `00:00`

#### Scenario: Save Edit
- **WHEN** user modifies fields and clicks `Simpan` in edit mode
- **THEN** a `PATCH /api/v1/transactions/{transactionId}` request is sent with only the changed fields, where `date` is a full ISO datetime with local offset built from the date and time inputs
- **THEN** on success, the drawer reverts to view mode showing updated values, and ledger and dashboard data refresh

#### Scenario: Cancel Edit
- **WHEN** user clicks `Batal` or presses `Escape` during edit mode
- **THEN** the drawer reverts to view mode without sending any API request

#### Scenario: Edit Transfer Transaction
- **WHEN** user edits a transaction with `transactionType: "transfer"`
- **THEN** the type switcher is locked to `Transfer` and cannot be changed (transfer transactions cannot be reclassified via PATCH)

## ADDED Requirements

### Requirement: List and Board Date Display Unchanged
Ledger lists, horizon board columns, cockpit recent ledger, wallet drawer tables, and account page last-transaction labels SHALL continue to show date-only values with no time portion, while ordering uses the full datetime.

#### Scenario: Lists Show Date Only
- **WHEN** transactions with distinct times on the same day appear in the Ledger table, mobile feed, horizon board, or cockpit recent list
- **THEN** each row shows only the date (no `HH:mm` text) in the same format as before this change

#### Scenario: Same-Day Ordering Uses Time
- **WHEN** multiple transactions share the same calendar date but have different times
- **THEN** they are ordered by their full datetime (time decides the sequence within the day)
