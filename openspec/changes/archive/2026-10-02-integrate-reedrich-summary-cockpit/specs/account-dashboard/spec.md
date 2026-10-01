# Spec Delta: account-dashboard

## ADDED Requirements

### Requirement: Safe-to-Spend Runway & Forward Cashflow Projections
The dashboard SHALL display the user's mathematical safe-to-spend runway, daily allowance, forward-looking 30-day cashflow commitments, and support one-tap realization of planned recurring occurrences directly from the Cockpit workbench.

#### Scenario: Render Mathematical Safe-to-Spend Runway
- **WHEN** summary data is successfully loaded from Reedrich API
- **THEN** the Cockpit KPI strip displays the true `safeToSpend` runway amount and the calculated `dailySafeToSpend` allowance for the remaining days in the active period
- **THEN** the spendable wallet balance and safe-to-spend runway are clearly distinguished

#### Scenario: Deficit Runway Warning Display
- **WHEN** `safeToSpendDetails.isDeficit` is true (planned commitments exceed spendable cash)
- **THEN** the Cockpit alert banner dynamically displays a prominent deficit warning with the negative deficit amount and negative daily allowance
- **THEN** the banner indicates that planned commitments and active debts exceed current liquid reserves without relying on hardcoded goal string searches

#### Scenario: 30-Day Forward Cashflow Projections Widget
- **WHEN** `cashflowProjections` are returned by the summary engine
- **THEN** the dashboard renders an upcoming commitments timeline showing the lookahead period, projected net change, and chronological list of upcoming scheduled bill/income events with dates and amounts

#### Scenario: One-Tap Planned Recurring Realization
- **WHEN** user clicks the "Terapkan / Bayar" action on an upcoming planned transaction linked to a recurring template
- **THEN** the client dispatches an atomic realization request (`/api/v1/recurring-templates/{templateId}/apply`)
- **THEN** on success, the transaction transitions to realized status and wallet balances refresh immediately
