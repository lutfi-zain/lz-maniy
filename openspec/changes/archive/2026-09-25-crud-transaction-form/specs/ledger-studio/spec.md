# ledger-studio Spec Delta

## ADDED Requirements

### Requirement: Transaction Row Click-to-Detail
Clicking a transaction row in the Ledger table SHALL open the transaction detail drawer.

#### Scenario: Click Row on Desktop Table
- **WHEN** user clicks a transaction row in the desktop tabular grid
- **THEN** the drilldown drawer opens in `transaction-detail` mode for that transaction
- **THEN** the row visually indicates it is the active/selected transaction

#### Scenario: Tap Row on Mobile Feed
- **WHEN** user taps a transaction item in the mobile dense document feed
- **THEN** the drilldown drawer opens in `transaction-detail` mode for that transaction

### Requirement: Ledger Create Transaction Action
The Ledger page header SHALL include a create action that opens the transaction form.

#### Scenario: Click Catat on Desktop
- **WHEN** user clicks the `[+ Catat]` button in the Ledger header area on desktop
- **THEN** the transaction form drawer opens in create mode
