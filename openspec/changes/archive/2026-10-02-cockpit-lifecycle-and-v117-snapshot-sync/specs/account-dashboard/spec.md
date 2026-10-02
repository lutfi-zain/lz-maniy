# Spec Delta: account-dashboard

## ADDED Requirements

### Requirement: Cockpit Active Budget Lifecycle Filtering
The Cockpit operational workbench MUST only display budgets whose active periods coincide with the reference date or selected date range, and MUST exclude completed or expired historical budgets.

#### Scenario: Budget period has elapsed
- **WHEN** a budget's `periodEnd` date is prior to the active timeframe (e.g. status is `completed` or `isPast` is true)
- **THEN** `CockpitAllocationWidget` MUST NOT render that budget in the active budgets summary block
- **AND** if no active budgets remain for the timeframe, the widget MUST display a neutral empty state ("Tidak ada pagu aktif.").

#### Scenario: User changes date range in Cockpit
- **WHEN** the user selects a different date range preset (e.g. switching between "Bulan Ini" and "Bulan Lalu")
- **THEN** the Cockpit MUST re-fetch the account detail snapshot passing `startDate` and `endDate`
- **AND** the active budgets summary block MUST update to reflect the budgets valid for that specific timeframe.

### Requirement: Cockpit Goal Alert Pacing Lifecycle Filtering
The Cockpit pacing alert banner MUST only display warnings for active, unfulfilled goals whose target deadline has not elapsed.

#### Scenario: Goal is reached or deadline has passed
- **WHEN** a goal is marked `isReached: true`, has status `completed`, or has a negative `daysRemaining` (overdue/past)
- **THEN** `CockpitAlertBanner` MUST NOT render a pacing deficit warning for that goal.
