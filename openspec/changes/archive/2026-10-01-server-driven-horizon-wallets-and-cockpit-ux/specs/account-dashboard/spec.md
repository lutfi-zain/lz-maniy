# Spec Delta: account-dashboard

## ADDED Requirements

### Requirement: Account Balance Snapshot and Point-in-Time Filtering
The system MUST retrieve user wallet balances and portfolio metrics using server-driven point-in-time filtering parameters (`startDate`, `endDate`, and status `filter`) so that selecting a date range in the Account & Banking dashboard immediately and accurately reflects wallet balances for that specific timeframe.

#### Scenario: User changes date range in Account & Banking
- **WHEN** the user selects a custom date range or preset in `/accounts` (e.g. `startDate: '2026-08-01'`, `endDate: '2026-08-31'`)
- **THEN** the system MUST invoke the server-driven wallet query with those date bounds
- **AND** the wallet card list and aggregated portfolio KPI tiles MUST update to show the historical closing balances for that period rather than falling back to an empty in-memory transaction list.

#### Scenario: Server error or offline fallback during point-in-time fetch
- **WHEN** the point-in-time wallet request fails or the network is offline
- **THEN** the system MUST retain the last known balance snapshot and display an unobtrusive inline status warning without crashing the view.

### Requirement: Interactive Account Navigation from Cockpit
The system MUST allow users to inspect individual wallet details and recent mutations directly from the Cockpit bank accounts widget without unwanted full-page navigation.

#### Scenario: User clicks a bank or sub-wallet row in Cockpit
- **WHEN** the user clicks an individual bank account or sub-wallet row in `CockpitBankWidget`
- **THEN** the system MUST open the wallet drawer (`WalletDrawerContent`) with the account metadata and recent transactions
- **AND** the user MUST remain on the Cockpit page unless clicking the global "Lihat Semua Akun" / "All Accounts" navigation link.
