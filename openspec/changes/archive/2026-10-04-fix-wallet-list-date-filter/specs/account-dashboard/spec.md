## MODIFIED Requirements

### Requirement: Account Balance Snapshot and Point-in-Time Filtering
The system MUST retrieve user wallet balances and portfolio metrics using server-driven point-in-time filtering parameters (`startDate`, `endDate`, and status `filter`) so that selecting a date range in the Account & Banking dashboard immediately and accurately reflects wallet balances for that specific timeframe, whether inspecting past historical periods or forward-looking planned intervals.

#### Scenario: User changes date range in Account & Banking
- **WHEN** the user selects a custom date range or preset in `/accounts` (e.g. `startDate: '2026-08-01'`, `endDate: '2026-08-31'`)
- **THEN** the system MUST invoke the server-driven wallet query with those date bounds
- **AND** the wallet card list and aggregated portfolio KPI tiles MUST update to show the historical closing balances for that period rather than falling back to an empty in-memory transaction list.

#### Scenario: User changes date range in Account & Banking to future planned period
- **WHEN** the user selects a future date range or preset in `/accounts` (e.g. `Next Month` where planned transactions exist)
- **THEN** the system MUST invoke `fetchWallets` with those future date bounds
- **AND** each individual wallet card in the list view MUST display the projected balance incorporating planned transactions
- **AND** the top macro KPI tiles and institution subtotals MUST reflect the forward-looking projected totals.

#### Scenario: Server error or offline fallback during point-in-time fetch
- **WHEN** the point-in-time wallet request fails or the network is offline
- **THEN** the system MUST retain the last known balance snapshot and display an unobtrusive inline status warning without crashing the view.
