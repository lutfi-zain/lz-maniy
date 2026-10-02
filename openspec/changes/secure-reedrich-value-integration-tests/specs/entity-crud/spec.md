# Spec Delta

## MODIFIED Requirements

### Requirement: Goal Creation

The system SHALL allow users to create financial goals with target amounts, target dates, currency, optional notes, and optional linked wallets. Linked goals SHALL derive progress from their wallet balances; unlinked goals SHALL retain supported stored-balance editing without a contribution endpoint.

#### Scenario: Open Goal Creation Form
- **WHEN** the user opens goal creation from the goals section or planning view
- **THEN** the drawer presents the supported name, target amount, currency, target date, linked-wallet and notes fields in create mode
- **AND** current amount initializes from linked wallets or the supported unlinked stored-balance state.

#### Scenario: Create Manual Savings Goal
- **WHEN** the user submits a valid goal without linked wallets
- **THEN** the goal is persisted with its supported stored-balance state and is not derived
- **AND** the drawer closes, success is shown, and the goal list and dashboard refresh without a contribution request.

#### Scenario: Create Derived Goal with Linked Wallets
- **WHEN** the user submits a valid goal with one or more linked wallets
- **THEN** the goal is persisted with those associations and is derived
- **AND** its current amount is the aggregate linked balance converted to the goal currency.

#### Scenario: Validation Error on Goal Creation
- **WHEN** the user submits an empty name, non-positive target amount, or invalid date input
- **THEN** inline errors are shown and the invalid create request is not submitted.

### Requirement: View Goal Details and Progress

The system SHALL display goal details and progress in the existing detail drawer, including linked wallet breakdown, pacing metrics, status, and supported edit/delete actions. It SHALL NOT advertise a retired contribution action.

#### Scenario: Open Goal Detail Drawer
- **WHEN** the user clicks a goal card in the Goals workspace or an allocation widget
- **THEN** the detail drawer displays the goal name, target amount, current amount, progress, target date/day state, notes, derived indicator, and supported edit/delete/wallet-management actions
- **AND** it displays available pacing metrics without a retired contribution action.

#### Scenario: Display Linked Wallets Breakdown
- **WHEN** the viewed goal is derived with linked wallets
- **THEN** the drawer shows each wallet's name, native balance/currency, converted amount and available peg metadata
- **AND** the goal amount equals their aggregate converted balance and clicking a linked wallet opens its detail view.

#### Scenario: Display Multi-Currency Converted Balance
- **WHEN** the goal is linked to wallets with multiple currencies
- **THEN** each native balance and its equivalent in the goal currency are shown using the active conversion reference.

#### Scenario: Goal Actions Available
- **WHEN** the goal detail drawer is open
- **THEN** the user can edit or request deletion of the goal using supported actions
- **AND** no action invokes a goal contribution endpoint.

### Requirement: Edit Goal

The system SHALL allow users to edit the documented goal fields and to manage wallet associations through supported link/unlink operations.

#### Scenario: Enter Goal Edit Mode
- **WHEN** the user clicks Edit in the goal detail drawer
- **THEN** supported editable metadata, target/date/currency, notes/status, and wallet associations are populated with current values.

#### Scenario: Save Goal Updates
- **WHEN** the user saves valid changes to supported fields, including target/date or documented completed/cancelled status
- **THEN** the goal update persists and wallet association changes use their supported link/unlink operations
- **AND** the drawer returns to detail view with recalculated progress/pacing and refreshed financial state.

#### Scenario: Cancel Goal Edit
- **WHEN** the user cancels or presses Escape in edit mode
- **THEN** unsaved changes are discarded and the drawer returns to detail without a mutation request.

#### Scenario: Validation Error on Edit
- **WHEN** the user tries to save a zero or negative target amount
- **THEN** inline validation is shown and the invalid goal update is not submitted.

#### Scenario: Link Additional Wallet to Existing Goal
- **WHEN** the user adds a wallet to a goal in edit mode
- **THEN** the supported wallet association is created and the goal's derived balance is refreshed.

#### Scenario: Unlink Wallet from Goal
- **WHEN** the user removes a linked wallet in edit mode
- **THEN** the association is removed and the goal's derived balance is refreshed.

### Requirement: Goal State Reconciliation

The system SHALL refresh goal, wallet, and snapshot state after goal create, update, delete, link/unlink, or relevant transaction/transfer mutations so that all goal surfaces display consistent amounts and lifecycle state.

#### Scenario: Invalidate and Refresh After Mutation
- **WHEN** any supported goal mutation succeeds
- **THEN** related caches and account state refresh so active goals, net worth, wallet allocations and affected horizon projections reflect the new state.

#### Scenario: Transfer Into Linked Wallet Updates Goal
- **WHEN** a realized transfer changes a linked wallet's balance
- **THEN** the corresponding goal amount and progress reflect that wallet change without a manual current-amount patch or contribution request.

### Requirement: Recurring Template Realization and Application

The system SHALL realize an existing materialized planned occurrence through the supported recurring realization operation. Creating a recurring template SHALL already materialize its planned occurrences; realizing one SHALL update that occurrence in place rather than create a duplicate transaction.

#### Scenario: Creating Template Materializes Planned Occurrences
- **WHEN** an active recurring template with an applicable schedule is created
- **THEN** its scheduled transactions are available as planned occurrences
- **AND** creation does not move realized wallet balances.

#### Scenario: Successfully Apply Recurring Template with Default Amount
- **WHEN** the user realizes an existing due planned occurrence without changing its amount
- **THEN** that occurrence retains its ID, becomes realized, and moves the appropriate balance exactly once
- **AND** its schedule advances under the supported contract and success is shown without a duplicate transaction.

#### Scenario: Apply Recurring Template with Modified Actual Amount
- **WHEN** the user realizes an existing occurrence with an actual amount different from its planned amount
- **THEN** the same transaction becomes realized at the actual amount and retains planned metadata for variance
- **AND** only the actual monetary effect is applied to its wallets.

#### Scenario: Attempt to Apply Already-Realized Occurrence
- **WHEN** the same occurrence is realized again
- **THEN** the operation is rejected with an appropriate error and no further debit or duplicate transaction.

#### Scenario: Apply Action API Failure
- **WHEN** realization fails due to network or domain error
- **THEN** the error is surfaced without a new duplicate transaction or false successful schedule advancement.

### Requirement: Store Unit Test Suite Coverage

The system SHALL have deterministic unit tests for consumer-visible CRUD form validation, financial calculations, mutation error handling, and state/cache transitions. Mocked method/body forwarding alone SHALL NOT count as correctness coverage for persisted CRUD or financial values.

#### Scenario: Unit tests cover successful store mutations
- **WHEN** a supported create, update or delete completes successfully in isolated unit coverage
- **THEN** consumer state and cache transitions are verified, rather than only mocked HTTP method/body forwarding.

#### Scenario: Unit tests cover API failure and error states
- **WHEN** a mutation fails with a network or API error
- **THEN** the error is surfaced without crashing and prior consistent consumer state is preserved.

#### Scenario: Financial Rule Boundary Is Tested Offline
- **WHEN** a deterministic financial calculation or form validation has a meaningful boundary
- **THEN** its unit test verifies the boundary's consumer-visible result without a live credential.

### Requirement: E2E Goal Lifecycle Management

The system SHALL have browser E2E coverage for persisted goal creation, detail reading, editing, linking/unlinking, transaction-driven progress, and final deletion.

#### Scenario: Goal creation, contribution, and deletion
- **WHEN** the browser test creates a goal, links a wallet, funds that wallet with a supported transaction/transfer, edits the goal, validates dependent values, and finally deletes it
- **THEN** progress and target changes persist and display correctly, and the goal is removed from the dedicated account
- **AND** funding uses no retired contribution endpoint or manual synchronization of linked-wallet current amount.

#### Scenario: Create and Verify Goal
- **WHEN** the browser test submits a valid goal with a dedicated linked wallet
- **THEN** the goal is persisted and both API reads and its rendered detail show the expected target, wallet association, and derived amount.

#### Scenario: Edit and Verify Goal
- **WHEN** the browser test updates a goal's target or wallet associations
- **THEN** the updated state persists and the rendered progress reflects it.

#### Scenario: Fund a Goal Through Its Wallet
- **WHEN** the browser test records a transfer into a linked wallet
- **THEN** its goal current amount and percentage increase by the independently calculated wallet delta
- **AND** the test performs no contribution request or manual synchronization patch.

#### Scenario: Delete Goal After Dependent Validation
- **WHEN** numeric, historical, and forecast assertions involving the goal are complete
- **THEN** the browser test deletes the goal and verifies its absence and removal of wallet associations.

### Requirement: Test Data Isolation and Determinism

The live CRUD suite SHALL exclusively own an explicitly authorized dedicated test account, erase its mutable financial data before setup, create fresh data, retain data through all dependent assertions, and clean it again after execution. Protected system categories and the user identity SHALL remain intact.

#### Scenario: Automated test cleanup on failure or success
- **WHEN** an authorized live run finishes, whether successful or failed
- **THEN** final teardown deletes its created IDs and any remaining mutable finance data in the approved dedicated account
- **AND** lack of target/identity authorization never permits a destructive teardown.

#### Scenario: Unique entity namespaces
- **WHEN** test entities are created in an authorized sequential run
- **THEN** unique run-prefixed names avoid collisions while stable returned IDs identify entities
- **AND** unique names are not treated as permission for concurrent account wiping.

#### Scenario: Pre-Test Cleanup
- **WHEN** identity and target authorization succeed before a live run
- **THEN** stale transactions, recurring templates, wallet/goal associations, goals, budgets, debts/loans, user categories, and wallets are removed in dependency-safe order
- **AND** pagination is exhausted and the empty-state verification succeeds before setup.

#### Scenario: Retain Data Until Validation Completes
- **WHEN** cross-entity, historical, or forecast assertions remain pending
- **THEN** lifecycle Delete steps do not remove the fixture data they require.

#### Scenario: Normal Final Cleanup
- **WHEN** all dependent assertions complete
- **THEN** browser Delete steps verify persistence removal and transaction balance reversals
- **AND** final cleanup removes remaining mutable entities, resets unlinked wallets to zero before deletion, and verifies the authorized account is clean.

#### Scenario: Partial Setup or Test Failure
- **WHEN** a run fails after creating any subset of entities
- **THEN** final cleanup still executes for that authorized account
- **AND** cleanup failure is reported as failure rather than hidden by the original result.

#### Scenario: Concurrent Run Is Not Authorized
- **WHEN** another live run already owns the same dedicated account
- **THEN** a second run does not wipe or mutate that account until exclusive ownership is available.

## REMOVED Requirements

### Requirement: Manual Goal Contribution

**Reason**: The contribution operation is user-confirmed deprecated and absent from the current Reedrich OpenAPI contract; its frontend method has no UI consumer.

**Migration**: Record supported transactions/transfers into linked wallets and derive goal progress from their balances. Unlinked goals retain documented stored-balance editing; no contribution compatibility path remains.

#### Scenario: Existing Funding Intent Uses Supported Transactions
- **WHEN** a user wants to fund a linked goal
- **THEN** money is moved through its linked wallet using a supported transaction or transfer, without a retired contribution operation.
