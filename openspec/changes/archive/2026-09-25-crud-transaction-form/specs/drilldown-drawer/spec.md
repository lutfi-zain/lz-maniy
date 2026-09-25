# drilldown-drawer Spec Delta

## ADDED Requirements

### Requirement: Transaction Detail Drawer Type
The drawer SHALL support a `transaction-detail` type that displays full metadata for a single transaction record.

#### Scenario: Open Transaction Detail
- **WHEN** a drawer is opened with `type: "transaction-detail"` and a `TransactionRecord` in its data payload
- **THEN** the drawer renders a formatted, read-only detail view of that transaction including date, description, category, wallet routing, amount, fees, type, and planned status

### Requirement: Transaction Form Drawer Type
The drawer SHALL support a `transaction-form` type that provides create and edit form functionality.

#### Scenario: Open Create Form
- **WHEN** a drawer is opened with `type: "transaction-form"` and no existing transaction in its data payload
- **THEN** the drawer renders an empty form in create mode with the type switcher defaulting to expense

#### Scenario: Open Edit Form
- **WHEN** a drawer is opened with `type: "transaction-form"` and an existing `TransactionRecord` in its data payload
- **THEN** the drawer renders the form pre-populated with the transaction's current values in edit mode
