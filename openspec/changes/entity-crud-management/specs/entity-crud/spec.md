# Spec Delta

## Purpose
Provides full Create, Read (detail view), Update, and Delete operations for financial entities (wallets, categories, budgets, goals, recurring templates, and user profile) via the Reedrich REST API, supported by slide-over form drawers, validation guards, and real API E2E test suites.

## ADDED Requirements

### Requirement: Wallet Form Drawer Accessibility
The wallet form drawer SHALL be accessible in create mode from wallet overview surfaces and in edit mode from the wallet detail view.

#### Scenario: Open Create Wallet Form
- **WHEN** user clicks the action to add a new wallet (e.g., "+ Tambah Dompet" button on accounts/wallets dashboard)
- **THEN** the wallet form drawer opens in create mode with empty fields: name, institution, type (defaulting to "bank"), initial balance (defaulting to 0), currency (defaulting to "IDR"), and isLocked toggle (defaulting to false / 0)

#### Scenario: Open Edit Wallet Form from Detail View
- **WHEN** user opens a wallet's detail drawer and clicks the "Edit" action button
- **THEN** the drawer transitions to edit mode populated with the current wallet's attributes: name, institution, type, balance, currency, and isLocked status

#### Scenario: Dismiss Wallet Form Drawer
- **WHEN** user presses Escape, clicks the backdrop overlay, or clicks the close button on the drawer
- **THEN** the drawer closes and any unsaved changes in the form are discarded without persisting

### Requirement: Create Wallet
The system SHALL support creating a new wallet with configurable metadata and initial balance via `POST /api/v1/wallets`.

#### Scenario: Successfully Create Wallet
- **WHEN** user provides valid wallet details (name: "BCA Utama", institution: "BCA", type: "bank", balance: 5000000, currency: "IDR", isLocked: false) and submits the form
- **THEN** a `POST /api/v1/wallets` request is sent with the wallet payload
- **THEN** on successful creation, the form drawer closes, a success toast notification appears, and wallet lists and net worth summaries refresh

#### Scenario: Validation Error on Missing Name
- **WHEN** user attempts to submit a wallet with an empty or whitespace-only name
- **THEN** the submission is blocked and an inline validation error indicates that wallet name is required

#### Scenario: Unsupported or Invalid Currency
- **WHEN** user enters or selects an invalid or unsupported currency code
- **THEN** the submission is blocked with an inline validation error indicating valid ISO currency format is required (e.g., IDR, USD)

#### Scenario: Duplicate Wallet Name Conflict
- **WHEN** user attempts to create a wallet with a name identical to an existing active wallet under the user account
- **THEN** the API returns a 400 or 409 conflict error
- **THEN** the form remains open, displays the conflict error message, and preserves entered values for correction

### Requirement: Edit Wallet
The system SHALL support editing an existing wallet's metadata, type, currency, and lock status via `PATCH /api/v1/wallets/{id}`.

#### Scenario: Successfully Update Wallet Details
- **WHEN** user modifies wallet fields (e.g., changes institution or updates wallet name) and submits the edit form
- **THEN** a `PATCH /api/v1/wallets/{id}` request is sent with the updated attributes
- **THEN** on success, the form drawer reverts or closes, a success toast appears, and all related wallet data across the application refresh

#### Scenario: Toggle Wallet Lock Status (isLocked)
- **WHEN** user toggles the `isLocked` flag from unlocked (0 / spendable) to locked (1 / reserve/locked partition) or vice versa and saves
- **THEN** a `PATCH /api/v1/wallets/{id}` request is sent with `isLocked` updated accordingly
- **THEN** on success, the wallet moves between spendable and locked partitions in the account breakdown and dashboard summaries

#### Scenario: Edit Wallet Balance Correction
- **WHEN** user updates the balance field in the edit form to match actual account holdings and submits
- **THEN** a `PATCH /api/v1/wallets/{id}` request is sent with the updated balance
- **THEN** on success, net worth calculations, partition totals, and cockpit metrics update immediately

### Requirement: Delete Wallet
The system SHALL support wallet deletion via `DELETE /api/v1/wallets/{id}` only when the wallet balance is zero and there are no active dependencies or links.

#### Scenario: Confirm Delete Wallet
- **WHEN** user clicks the "Hapus" (delete) button on a wallet detail view
- **THEN** a confirmation dialog opens with a warning describing the permanent removal of the wallet and requiring explicit user confirmation

#### Scenario: Successfully Delete Eligible Wallet
- **WHEN** the wallet has a balance of zero, no active savings goal allocations, and no active recurring transaction templates linked
- **AND** the user confirms deletion in the dialog
- **THEN** a `DELETE /api/v1/wallets/{id}` request is sent
- **THEN** on success, the confirmation dialog and drawer close, a success toast notification appears, and the deleted wallet is removed from the UI and state

#### Scenario: Delete Prevented Due to Non-Zero Balance
- **WHEN** user attempts to delete a wallet with a balance greater than zero (or negative)
- **THEN** the system prevents submission or the API rejects the request with an error indicating balance must be zero prior to deletion
- **THEN** an error message is displayed informing the user to transfer or adjust remaining funds to zero before deleting

#### Scenario: Delete Prevented Due to Active Goal or Recurring Links
- **WHEN** user attempts to delete a wallet with balance zero that is still linked to an active goal or recurring template
- **THEN** the API rejects the deletion with an error stating active links exist
- **THEN** an error banner informs the user to unlink or reassign the associated goal or recurring template first

#### Scenario: Cancel Deletion Dialog
- **WHEN** user dismisses or clicks "Batal" in the delete confirmation dialog
- **THEN** the confirmation dialog closes, no API call is dispatched, and the wallet detail drawer remains unchanged

### Requirement: Wallet State Reconciliation
The system SHALL synchronize global financial state following any wallet mutation (create, edit, delete).

#### Scenario: State Invalidation and Refresh
- **WHEN** a wallet is successfully created, updated, or deleted
- **THEN** `invalidateAndRefresh()` (or equivalent store refresh routines) triggers `fetchSnapshot()` to update wallet balances, partitions, net worth, and horizon metrics
- **THEN** any cached wallet dropdowns in transaction forms, transfer forms, and filter bars update with the latest wallet records

### Requirement: Category Form Accessibility and Drawer Presentation
The category management interface SHALL provide drawer-based forms for creating and editing categories, accessible from category lists or management actions.

#### Scenario: Open Create Category Drawer
- **WHEN** user triggers the action to create a new category
- **THEN** a category form drawer slides in from the right in create mode with empty fields and type defaulting to expense (`EXPENSE`)

#### Scenario: Open Edit Category Drawer
- **WHEN** user selects an existing user-defined category to edit
- **THEN** the category form drawer slides in with the category's current name and icon pre-filled
- **THEN** the category type (expense or income) is displayed as read-only and cannot be changed

#### Scenario: Dismiss Category Form Drawer
- **WHEN** the category form drawer is open and the user clicks the close button, presses `Escape`, or clicks the backdrop
- **THEN** the drawer closes and any unsaved changes are discarded without saving

### Requirement: Category Creation
The category form SHALL validate user inputs and create a new category with a designated type, name, and icon.

#### Scenario: Successfully Create Category with Emoji Icon
- **WHEN** user enters a non-empty category name (e.g., "Groceries"), selects a valid type (`EXPENSE` or `INCOME`), provides a valid emoji or icon string (e.g., "🛒"), and clicks submit
- **THEN** a create request is sent to `POST /categories` with the provided name, type, and icon
- **THEN** on success, the drawer closes, a success notification is shown, and the category list refreshes automatically

#### Scenario: Validation Rejection on Empty or Whitespace Name
- **WHEN** user leaves the category name blank or enters only whitespace and attempts to submit
- **THEN** submission is prevented and an inline validation error is displayed indicating that the category name is required

#### Scenario: Create Category API Error Handling
- **WHEN** the API request fails (e.g., network failure or duplicate name conflict)
- **THEN** the drawer remains open with input values preserved and an error message is presented to the user

### Requirement: Category Modification
The category form SHALL allow updating an existing category's name and icon while strictly enforcing immutability of the category type.

#### Scenario: Successfully Update Category
- **WHEN** user changes the category name or icon in edit mode and submits the form
- **THEN** an update request is sent to `PATCH /categories/{id}` with the modified fields
- **THEN** on success, the drawer closes, a success notification is displayed, and category views are refreshed

#### Scenario: Category Type Immutability Enforced
- **WHEN** user views an existing category in the edit form
- **THEN** the category type field is disabled or immutable, preventing modification of `EXPENSE` vs `INCOME` classification

#### Scenario: Validation Rejection on Empty Name During Edit
- **WHEN** user clears the name field to empty or whitespace in edit mode and submits
- **THEN** submission is prevented and an inline validation error is displayed

### Requirement: Category Deletion
The interface SHALL allow deleting custom categories upon explicit user confirmation, while strictly prohibiting the deletion of system-protected categories.

#### Scenario: Delete Custom Category with Explicit Confirmation
- **WHEN** user initiates deletion for a user-defined category and confirms the confirmation dialog
- **THEN** a delete request is sent to `DELETE /categories/{id}`
- **THEN** upon successful deletion, any open drawer closes, a success feedback notification is shown, and the deleted category is removed from all category selectors and lists

#### Scenario: Attempt Delete System Protected Category
- **WHEN** user views or interacts with the system-protected category (e.g., 'Adjustment')
- **THEN** the delete action is disabled or hidden
- **THEN** if a delete action is attempted against a system-protected category, the system blocks the request and informs the user that system categories cannot be deleted

#### Scenario: Delete Category Failure
- **WHEN** deleting a category fails due to API error or network failure
- **THEN** an error message is presented to the user and the category remains in the list

### Requirement: Category Seeding
The category interface SHALL allow initializing default categories for a new account using the seed endpoint.

#### Scenario: Trigger Seed Default Categories
- **WHEN** user initiates default category seeding
- **THEN** a request is sent to `POST /categories/seed`
- **THEN** upon success, the category store reconciles and displays the newly seeded default categories

### Requirement: Budget Form Drawer Accessibility
The budget form drawer SHALL be accessible in create mode from budget list views and in edit mode from the budget detail drawer.

#### Scenario: Open Create Budget Drawer from Budgets Section
- **WHEN** user clicks the "+ Tambah Budget" action button on the Planning Studio budgets section or dashboard budget overview
- **THEN** a budget form drawer slides in from the right in create mode with blank fields: name, amount limit, period start date, period end date, and an optional category selector
- **THEN** period start date defaults to the first day of the current month and period end date defaults to the last day of the current month

#### Scenario: Open Edit Budget Drawer from Detail View
- **WHEN** user opens a budget detail drawer and clicks the "Edit" action button
- **THEN** the budget form drawer opens in edit mode pre-populated with the budget's current values: name, amount limit, period start date, period end date, and linked category (if assigned)

#### Scenario: Dismiss Budget Form Drawer
- **WHEN** the budget form drawer is open and the user clicks the close button, clicks the backdrop overlay, or presses `Escape`
- **THEN** the drawer closes and any unsaved modifications are discarded without saving

### Requirement: Create Budget
The system SHALL validate inputs and create a new spending budget via `POST /api/v1/budgets`.

#### Scenario: Successfully Create Budget with Linked Category
- **WHEN** user provides a valid name (e.g. "Belanja Bulanan"), an amount limit greater than or equal to 0.01 (e.g. 3500000), a valid start date (e.g. 2026-10-01), an end date on or after the start date (e.g. 2026-10-31), selects an optional category (e.g. "Groceries"), and clicks submit
- **THEN** a `POST /api/v1/budgets` request is dispatched with the budget payload
- **THEN** upon successful creation, the form drawer closes, a success toast notification appears, and active budgets and snapshot metrics refresh automatically

#### Scenario: Successfully Create Budget Without Linked Category
- **WHEN** user provides valid budget details without selecting a category (unassigned/general spending budget) and submits
- **THEN** a `POST /api/v1/budgets` request is dispatched with `categoryId` as null or omitted
- **THEN** on success, the budget is created and rendered as a general budget

#### Scenario: Validation Rejection on Missing or Empty Name
- **WHEN** user leaves the budget name blank or enters whitespace only and attempts to submit
- **THEN** submission is prevented and an inline validation error indicates that budget name is required

#### Scenario: Validation Rejection on Invalid Amount Limit
- **WHEN** user enters an amount less than 0.01 (e.g. 0, negative value, or non-numeric input)
- **THEN** submission is prevented and an inline validation error indicates that the budget amount limit must be at least 0.01

#### Scenario: Validation Rejection When Period End is Before Start
- **WHEN** user enters a period end date that is chronologically earlier than the period start date (e.g. start: 2026-10-15, end: 2026-10-10)
- **THEN** submission is blocked and an inline validation error indicates that period end date must be on or after the period start date

#### Scenario: Validation Rejection on Overlapping Periods for Same Category
- **WHEN** user attempts to create a budget for a category that already has an active budget spanning overlapping calendar dates
- **THEN** the API or client validation returns a period overlap conflict error
- **THEN** the form remains open with inputs preserved, displaying an error message that a budget for this category already exists within the specified period

#### Scenario: Create Budget Network or Server Error Handling
- **WHEN** the `POST /api/v1/budgets` request fails due to network outage or 5xx server error
- **THEN** the form drawer remains open, all entered field values are retained, and an error alert is displayed informing the user of the failure

### Requirement: Edit Budget
The system SHALL support updating an existing budget's name, amount limit, period dates, and linked category via `PATCH /api/v1/budgets/{id}`.

#### Scenario: Successfully Update Budget Details
- **WHEN** user changes the budget name, updates the amount limit, adjusts period dates, or reassigns the linked category and submits the form
- **THEN** a `PATCH /api/v1/budgets/{id}` request is sent with the updated properties
- **THEN** on success, the form drawer closes, a success notification appears, and budget cards and utilization calculations refresh

#### Scenario: Unlink Category from Budget During Edit
- **WHEN** user clears the linked category on an existing budget that previously had a category assigned and submits
- **THEN** a `PATCH /api/v1/budgets/{id}` request is sent with `categoryId` explicitly set to null
- **THEN** on success, the budget is unlinked from the category, and subsequent expense tracking reflects the general budget status

#### Scenario: Validation Rejection on Invalid Amount or Inverted Dates During Edit
- **WHEN** user modifies the amount limit to less than 0.01 or sets the period end date earlier than the start date in edit mode
- **THEN** submission is blocked and the corresponding inline validation error is shown

#### Scenario: Overlapping Period Conflict on Edit
- **WHEN** user modifies the date range or category of an existing budget such that it overlaps with another existing budget for the same category
- **THEN** the API returns a conflict error
- **THEN** the form displays the conflict error and keeps the edited inputs intact

### Requirement: Delete Budget
The system SHALL support deleting an existing budget via `DELETE /api/v1/budgets/{id}` with safe preservation of historical transactions.

#### Scenario: Confirm Delete Budget
- **WHEN** user clicks the "Hapus Budget" action button on the budget detail view
- **THEN** a confirmation dialog opens with a clear explanation that deleting the budget will remove the spending cap but will not delete any associated transactions

#### Scenario: Successfully Delete Budget with Transaction Retention
- **WHEN** user confirms deletion in the confirmation dialog
- **THEN** a `DELETE /api/v1/budgets/{id}` request is sent to the API
- **THEN** on success, the confirmation dialog and drawer close, a success toast notification appears, and the budget is removed from all views
- **THEN** all transactions previously categorized or tracked under the deleted budget remain intact in the transaction ledger with `budgetId` cleared or unlinked

#### Scenario: Cancel Delete Budget Dialog
- **WHEN** user clicks "Batal" or dismisses the delete confirmation dialog
- **THEN** the confirmation dialog closes, no delete request is dispatched, and the budget remains active

#### Scenario: Delete Budget API Failure
- **WHEN** the `DELETE /api/v1/budgets/{id}` request fails due to network or server error
- **THEN** an error message is presented to the user, and the budget remains visible in the system

### Requirement: Budget State Reconciliation
The system SHALL reconcile application financial state immediately following any budget mutation.

#### Scenario: State Invalidation and Refresh After Budget Mutation
- **WHEN** a budget is successfully created, updated, or deleted
- **THEN** `invalidateAndRefresh()` (or equivalent store refresh routine) triggers `fetchSnapshot()` to recalculate active budgets, spent percentages, remaining allowances, and status badges
- **THEN** budget selector options in transaction form drawers and ledger filter bars update to reflect the latest budget list

### Requirement: Goal Creation
The system SHALL provide a drawer-based form to create new savings goals with either manual contribution tracking or automated derived balances via linked wallets.

#### Scenario: Open Goal Creation Form
- **WHEN** user clicks the `[+ Tambah Target]` or `[+ Buat Target]` button on the goals section or planning view
- **THEN** a form drawer opens in create mode with fields for goal name, target amount, currency (defaulting to IDR), target date, category selection, linked wallets selector, and optional notes
- **THEN** target amount input defaults to empty and current amount initializes according to linked wallets or manual starting amount

#### Scenario: Create Manual Savings Goal
- **WHEN** user fills required fields (name, target amount > 0, currency), leaves linked wallets empty, optionally provides an initial current amount and target date, and submits
- **THEN** a `POST /api/v1/goals` request is sent with the payload containing `name`, `targetAmount`, `currentAmount`, `currency`, `targetDate`, `categoryId`, and `notes`
- **THEN** on success, the drawer closes, a success notification appears, and the goal list and dashboard snapshot refresh showing the goal with `isDerived: false`

#### Scenario: Create Derived Goal with Linked Wallets
- **WHEN** user fills required fields and selects one or more existing wallets in `walletIds[]`
- **THEN** a `POST /api/v1/goals` request is sent with the selected `walletIds`
- **THEN** on success, the created goal is flagged with `isDerived: true` and its current amount reflects the consolidated balance of the linked wallets converted to the goal currency

#### Scenario: Validation Error on Goal Creation
- **WHEN** user submits with empty name, non-positive target amount, or invalid target date in the past
- **THEN** inline validation errors are displayed on the affected fields and no API request is sent

---

### Requirement: View Goal Details and Progress
The system SHALL display detailed progress metrics, target date pacing, and linked wallet breakdowns in the goal detail drawer.

#### Scenario: Open Goal Detail Drawer
- **WHEN** user clicks a goal card in the dashboard or planning view
- **THEN** the goal detail drawer opens showing: goal name, target amount, current amount, percentage progress bar, remaining days to target date, derived status indicator, notes, and action buttons (`[Edit]`, `[Hapus]`, `[Setor / Kontribusi]`, and wallet management controls)

#### Scenario: Display Linked Wallets Breakdown
- **WHEN** the viewed goal is a derived goal (`isDerived: true`) with linked wallets
- **THEN** the drawer displays each linked wallet's name, native balance, currency, converted amount in goal currency, and whether a currency peg was applied
- **THEN** clicking a linked wallet opens that wallet's detail view

#### Scenario: Display Multi-Currency Converted Balance
- **WHEN** a goal linked with wallets across multiple currencies (e.g., IDR and USD) is viewed
- **THEN** each wallet's balance is displayed in its native currency alongside its normalized equivalent in the goal's target currency based on active exchange rates

---

### Requirement: Edit Goal
The system SHALL allow updating goal metadata, target parameters, status, and linked categories.

#### Scenario: Enter Goal Edit Mode
- **WHEN** user clicks `[Edit]` in the goal detail drawer
- **THEN** the drawer transitions to edit mode, populating all form fields (name, target amount, currency, targetDate, categoryId, notes, and status) with current goal values

#### Scenario: Save Goal Updates
- **WHEN** user modifies editable fields (e.g. adjusts target amount, changes target date, or sets status to `completed` or `archived`) and clicks `Simpan`
- **THEN** a `PATCH /api/v1/goals/{id}` request is sent with the updated parameters
- **THEN** on success, the drawer returns to detail view with updated values and financial snapshots are refreshed

#### Scenario: Cancel Goal Edit
- **WHEN** user clicks `Batal` or presses `Escape` while in edit mode
- **THEN** changes are discarded and the drawer reverts to detail view without sending any network request

#### Scenario: Validation Error on Edit
- **WHEN** user modifies target amount to zero or a negative value and clicks `Simpan`
- **THEN** an inline error appears and no PATCH request is sent

---

### Requirement: Delete Goal
The system SHALL allow deleting a goal with explicit confirmation, automatically removing wallet associations without deleting user wallets or transactions.

#### Scenario: Open Delete Confirmation
- **WHEN** user clicks `[Hapus]` in the goal detail drawer
- **THEN** an explicit confirmation prompt appears warning that the goal will be removed and any linked wallet associations will be unlinked

#### Scenario: Confirm Goal Deletion
- **WHEN** user confirms the deletion prompt
- **THEN** a `DELETE /api/v1/goals/{id}` request is sent to the backend
- **THEN** on success, the drawer closes, a success notification appears, the goal is removed from the planning and cockpit lists, and linked wallets retain their funds and transactions intact

#### Scenario: Dismiss Delete Confirmation
- **WHEN** user cancels or dismisses the confirmation prompt
- **THEN** no DELETE request is sent and the drawer remains in view mode

---

### Requirement: Manual Goal Contribution
The system SHALL support logging manual monetary contributions toward non-derived savings goals.

#### Scenario: Open Contribution Form
- **WHEN** user clicks `[Setor / Kontribusi]` on an active goal
- **THEN** a contribution dialog or drawer opens prompting for contribution amount, optional funding source wallet, and contribution date

#### Scenario: Submit Contribution with Source Wallet
- **WHEN** user enters a valid contribution amount, selects a funding source wallet, and submits
- **THEN** a `POST /api/v1/goals/{id}/contribute` request is sent with `amount` and `walletId`
- **THEN** on success, the source wallet balance decreases, goal current amount increases, progress recalculates, and snapshot refreshes

#### Scenario: Submit Standalone Contribution
- **WHEN** user enters a contribution amount without selecting a source wallet (direct tracking)
- **THEN** a `POST /api/v1/goals/{id}/contribute` request is sent with `amount`
- **THEN** on success, the goal current amount increases by the contributed amount without altering any wallet balances

#### Scenario: Contribution Validation Error
- **WHEN** user submits a contribution with amount <= 0 or an amount exceeding selected wallet's available spendable balance
- **THEN** an error message is displayed and the contribution is not submitted

#### Scenario: Contribution to Completed Goal
- **WHEN** user attempts to contribute to a goal that has already reached 100% or is marked `completed`
- **THEN** the system prompts for confirmation to allow surplus savings or alerts the user that the target has been achieved before submitting

---

### Requirement: Link and Unlink Wallets
The system SHALL allow dynamically managing wallet associations for goals to convert between manual and derived balances or reconfigure linked asset pools.

#### Scenario: Link Additional Wallet to Goal
- **WHEN** user selects an available unlinked wallet and submits the link action in the goal drawer
- **THEN** a `POST /api/v1/goals/{id}/wallets` request is sent with `walletId`
- **THEN** on success, the wallet is appended to `linkedWalletsBreakdown`, goal `isDerived` becomes `true`, and current amount updates to include the newly linked wallet's balance

#### Scenario: Link Multi-Currency Wallet
- **WHEN** user links a wallet whose currency differs from the goal's target currency (e.g., USD wallet linked to an IDR goal)
- **THEN** the system fetches the conversion rate, applies the peg/rate, and updates the consolidated current amount reflecting the converted value

#### Scenario: Unlink Wallet from Goal
- **WHEN** user clicks unlink on a linked wallet entry and confirms
- **THEN** a `DELETE /api/v1/goals/{id}/wallets/{wid}` request is sent
- **THEN** on success, the wallet is removed from the goal's linked breakdown and the goal's current amount decreases by the unlinked wallet's contribution

#### Scenario: Unlink Last Wallet from Derived Goal
- **WHEN** user unlinks the final remaining linked wallet from a derived goal
- **THEN** a `DELETE /api/v1/goals/{id}/wallets/{wid}` request is sent
- **THEN** on success, `linkedWalletsBreakdown` becomes empty, the goal transitions to `isDerived: false`, and its current amount retains the last known balance or resets to 0 according to backend rules

---

### Requirement: Goal State Reconciliation
After any successful goal mutation (create, edit, delete, contribute, link, unlink), the application state SHALL be reconciled.

#### Scenario: Invalidate and Refresh After Mutation
- **WHEN** any goal mutation succeeds
- **THEN** `invalidateAndRefresh()` is triggered, invoking `fetchSnapshot()` to update active goals, net worth, spendable/locked allocations, and horizon board projections

### Requirement: Live Recurring Templates Integration on Planning View
The system SHALL fetch and display live recurring templates from `GET /recurring-templates` in place of hardcoded mock data on the planning interface.

#### Scenario: Display Live Recurring Templates List
- **WHEN** user navigates to the planning view under the obligations and recurring sub-tab
- **THEN** the system requests `GET /recurring-templates` and renders live templates with their name, frequency, next scheduled date, associated wallet, and amount
- **THEN** the total template count badge reflects the count of loaded templates

#### Scenario: Empty State when No Recurring Templates Exist
- **WHEN** the user has no configured recurring templates and views the recurring section
- **THEN** an empty state indicator is displayed informing the user that no recurring templates are currently configured, with an action to create one

#### Scenario: Loading State during Fetch
- **WHEN** the recurring templates are being fetched from the API
- **THEN** skeleton loading rows or an indicator are displayed until the request resolves

#### Scenario: Display Inactive Recurring Templates
- **WHEN** a recurring template has `isActive` set to false
- **THEN** the template is visually distinguished with an inactive or paused badge/styling
- **THEN** the user can clearly identify that automatic recurrence or schedule progression is paused

### Requirement: Recurring Template Form Accessibility and Drawer Presentation
The interface SHALL provide drawer-based forms for creating and editing recurring templates, accessible from the planning view and template actions.

#### Scenario: Open Create Recurring Template Drawer
- **WHEN** user clicks the action to add a new recurring template
- **THEN** a recurring template form drawer slides in from the right in create mode with empty fields, type defaulting to expense, frequency defaulting to monthly, interval defaulting to 1, and `isActive` defaulting to true

#### Scenario: Open Edit Recurring Template Drawer
- **WHEN** user selects an existing recurring template from the list
- **THEN** the recurring template form drawer slides in pre-filled with the template's current values (name, wallet, category, amount, transaction type, frequency, interval, start date, end date, notes, and active status)

#### Scenario: Dismiss Recurring Template Drawer
- **WHEN** the recurring template drawer is open and the user clicks close, presses `Escape`, or clicks the backdrop
- **THEN** the drawer closes and any unsaved edits are discarded without persisting

### Requirement: Recurring Template Creation
The recurring template form SHALL validate inputs and create a new recurring template via `POST /recurring-templates`.

#### Scenario: Successfully Create Recurring Template
- **WHEN** user specifies a valid name, selects an existing wallet and category, enters a positive amount, selects transaction type (`EXPENSE` or `INCOME`), selects frequency (`daily`, `weekly`, `monthly`, or `yearly`), specifies an interval (>= 1), provides a valid start date, optionally specifies an end date and notes, and submits
- **THEN** a request is sent to `POST /recurring-templates` with the configured payload
- **THEN** upon success, the drawer closes, a success notification appears, and the recurring templates list is refreshed

#### Scenario: Validation Rejection on Missing Required Fields
- **WHEN** user submits the form with missing required fields (e.g. empty name, non-positive amount, missing wallet, or missing start date)
- **THEN** submission is prevented and inline validation errors highlight each missing or invalid field

#### Scenario: Validation Rejection on Invalid Date Ranges
- **WHEN** user specifies an optional end date that is earlier than the start date
- **THEN** submission is blocked with an inline error indicating that the end date must be on or after the start date

#### Scenario: Create Recurring Template API Error Handling
- **WHEN** the creation API request fails due to server error or network outage
- **THEN** the drawer remains open with all inputs preserved and a descriptive error message is presented

### Requirement: Recurring Template Modification
The recurring template form SHALL allow updating all attributes of an existing recurring template and toggling its active status via `PATCH /recurring-templates/{id}`.

#### Scenario: Successfully Update Recurring Template Details
- **WHEN** user modifies fields (name, amount, wallet, category, interval, end date, or notes) of an existing template and submits
- **THEN** an update request is sent to `PATCH /recurring-templates/{id}` with the modified attributes
- **THEN** upon success, the drawer closes, a success notification is shown, and the updated details are reflected in the UI

#### Scenario: Update Frequency and Recalculate Next Run Date
- **WHEN** user changes the frequency (e.g., from monthly to weekly) or interval of an existing template and saves
- **THEN** the update is sent to `PATCH /recurring-templates/{id}`
- **THEN** the system updates the template and recalculates the subsequent `nextRunDate` based on the new frequency and interval schedule

#### Scenario: Toggle Active Status
- **WHEN** user toggles the `isActive` switch on an existing template (e.g., pausing an active template or re-activating a paused one) and submits
- **THEN** `PATCH /recurring-templates/{id}` is called with the new `isActive` boolean value
- **THEN** the template status updates immediately in the list view

#### Scenario: Update Failure Preserves Edit State
- **WHEN** updating a template fails due to API error or network failure
- **THEN** the drawer stays open, user input is preserved, and an error alert is displayed

### Requirement: Recurring Template Deletion
The interface SHALL allow deleting recurring templates upon explicit user confirmation via `DELETE /recurring-templates/{id}`.

#### Scenario: Successfully Delete Recurring Template with Explicit Confirmation
- **WHEN** user initiates deletion of a recurring template and confirms the destructive confirmation prompt
- **THEN** a request is sent to `DELETE /recurring-templates/{id}`
- **THEN** upon successful deletion, any open drawer closes, a success feedback notification is shown, and the template is removed from the planning list

#### Scenario: Cancel Deletion Prompt
- **WHEN** user initiates deletion but clicks cancel on the confirmation dialog
- **THEN** no deletion request is dispatched and the template remains unchanged

#### Scenario: Delete Recurring Template API Failure
- **WHEN** the delete request fails on the server
- **THEN** an error alert is presented to the user and the recurring template remains in the view

### Requirement: Recurring Template Realization and Application
The interface SHALL allow applying/realizing a recurring template occurrence into an actual transaction via `POST /recurring-templates/{id}/apply`.

#### Scenario: Successfully Apply Recurring Template with Default Amount
- **WHEN** user triggers the apply action on a recurring template occurrence without altering the amount
- **THEN** a request is sent to `POST /recurring-templates/{id}/apply` with the template's scheduled occurrence parameters
- **THEN** upon success, a realized transaction is created in the ledger, the template's `nextRunDate` advances to the next cycle, and a success notification is shown

#### Scenario: Apply Recurring Template with Modified Actual Amount
- **WHEN** user triggers apply and supplies an optional `actualAmount` that differs from the planned amount (e.g., utility bill variable usage)
- **THEN** `POST /recurring-templates/{id}/apply` is submitted including `{ actualAmount }`
- **THEN** the resulting realized transaction reflects the specified actual amount rather than the template base amount

#### Scenario: Attempt to Apply Already-Realized Occurrence
- **WHEN** user attempts to apply an occurrence that has already been realized for the current period (or if the server rejects due to duplicate realization)
- **THEN** the system prevents duplicate realization or gracefully handles the rejection, notifying the user that this cycle has already been realized

#### Scenario: Apply Action API Failure
- **WHEN** the apply request fails due to network outage or API error
- **THEN** an error message is displayed to the user, no duplicate transaction is logged, and the template schedule remains unadvanced

### Requirement: User Profile Display and Inspection
The application SHALL fetch and present the current authenticated user's profile details including first name, last name, email address, and WhatsApp contact number.

#### Scenario: Display current profile details
- **WHEN** user navigates to the profile view or opens profile settings
- **THEN** client retrieves user profile data via `GET /me`
- **THEN** user's first name, last name, email address, and WhatsApp phone number are displayed
- **THEN** the email address is displayed as a read-only field

### Requirement: Inline Profile Modification
The application SHALL allow the authenticated user to edit editable profile fields (first name, last name, and WhatsApp number) and submit updates via `PATCH /me`.

#### Scenario: Successful profile update
- **WHEN** user modifies first name, last name, or WhatsApp number and submits the changes
- **THEN** client sends a `PATCH /me` request containing the updated fields (`firstName`, `lastName`, `whatsappNumber`)
- **THEN** client updates the local user session state with the returned profile data
- **THEN** UI reflects the updated user identity across the application without requiring a page reload
- **THEN** client displays a confirmation that the profile was updated successfully

### Requirement: Profile Input Validation
The application SHALL validate user input before submitting profile changes and display inline validation errors when fields fail business constraints.

#### Scenario: Empty first name validation error
- **WHEN** user clears the first name field and attempts to save
- **THEN** client prevents request submission
- **THEN** client displays an inline validation message indicating that first name is required

#### Scenario: Invalid WhatsApp phone number format
- **WHEN** user enters a phone number with invalid characters or non-standard format and attempts to save
- **THEN** client prevents request submission
- **THEN** client displays an inline validation message indicating that a valid international or national phone number is required

### Requirement: Profile Update Error Handling
The application SHALL handle network or server failures gracefully when saving profile updates.

#### Scenario: Network error or server rejection on save
- **WHEN** client sends `PATCH /me` and the server responds with an error or the request fails due to network failure
- **THEN** client retains the user's unsaved edits in the form
- **THEN** client displays an error notification indicating that the profile update failed
- **THEN** client keeps previous authenticated profile state intact

### Requirement: E2E Wallet Lifecycle Management
The E2E test suite SHALL execute complete CRUD lifecycle verification for wallets using live Reedrich API authentication against the test account (`testbot@maniyy.dev`).
#### Scenario: Full CRUD lifecycle of a wallet with automated cleanup
- **WHEN** the test creates a new wallet with initial balance, edits its metadata (name or color), verifies the UI reflects the changes, and initiates deletion
- **THEN** the wallet is successfully created, modified, deleted from the UI, and removed from the live backend without leaving orphaned test records.

#### Scenario: Deletion blocked for wallet with non-zero balance
- **WHEN** a test user attempts to delete a wallet with a remaining positive or negative balance
- **THEN** the UI rejects the deletion or displays a domain error indicating that balance must be zero before deletion, leaving the entity intact.

### Requirement: E2E Category Lifecycle Management
The E2E test suite SHALL verify category creation, updates, system category protection, and deletion against the live backend API.
#### Scenario: Custom category CRUD and teardown
- **WHEN** the test creates a custom expense or income category, verifies its presence, edits its label or icon, and deletes it
- **THEN** all actions persist and reflect in the UI immediately, and teardown confirms total deletion from the backend.

#### Scenario: System category modification protection
- **WHEN** the test attempts to delete or alter protected system categories such as 'Adjustment'
- **THEN** the action is prevented with a clear error indication, and the protected category remains available.

### Requirement: E2E Budget Lifecycle Management
The E2E test suite SHALL verify budget creation, editing, category association, and deletion against live API endpoints.
#### Scenario: Budget CRUD and transaction retention verification
- **WHEN** the test creates a budget linked to a category, updates the spending limit, and subsequently deletes the budget
- **THEN** the budget is removed from the active budgets view while associated transactions remain intact.

### Requirement: E2E Goal Lifecycle Management
The E2E test suite SHALL verify savings goal creation, editing, target contribution, wallet association, and deletion.
#### Scenario: Goal creation, contribution, and deletion
- **WHEN** the test creates a savings goal, links a wallet, records a contribution, updates goal parameters, and deletes the goal
- **THEN** the progress and target updates reflect accurately in the UI and the goal is cleaned up from the test account.

### Requirement: E2E Recurring Template Lifecycle Management
The E2E test suite SHALL verify live recurring transaction templates, replacing mock views with API-backed workflows.
#### Scenario: Recurring template CRUD and template execution
- **WHEN** the test creates a recurring template, edits its schedule or amount, triggers manual execution or application, and deletes the template
- **THEN** recurring template state changes synchronize with the live API and clean up cleanly.

### Requirement: E2E Profile Updates
The E2E test suite SHALL verify user profile updates against the live API.
#### Scenario: User profile information update
- **WHEN** the test submits updated profile details (first name, last name, WhatsApp phone number) and reloads the profile view
- **THEN** the updated profile details persist and match the submitted values, and are restored to baseline after the test.

### Requirement: Test Data Isolation and Determinism
The E2E test suite SHALL guarantee deterministic test execution without collisions or leftover state across runs.
#### Scenario: Automated test cleanup on failure or success
- **WHEN** an E2E test finishes (either passing or failing)
- **THEN** an isolated teardown hook deletes all created entities using their tracked IDs against the live test API.

#### Scenario: Unique entity namespaces
- **WHEN** test entities are instantiated in concurrent or sequential runs
- **THEN** unique timestamped or UUID prefixes are applied to prevent naming conflicts with existing account data.

### Requirement: Store Unit Test Suite Coverage
Every CRUD store method across wallets, categories, budgets, goals, recurring templates, and user profile SHALL have dedicated unit tests with mocked network responses.
#### Scenario: Unit tests cover successful store mutations
- **WHEN** store methods for create, update, and delete are invoked with mocked successful responses
- **THEN** the internal reactive state reconciles correctly and cache invalidation is triggered.

#### Scenario: Unit tests cover API failure and error states
- **WHEN** a store mutation fails due to network disconnection or domain validation (4xx/5xx responses)
- **THEN** the store captures the error, maintains previous consistent state, and exposes user-friendly error details without crashing.
