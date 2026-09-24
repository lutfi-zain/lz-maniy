# Spec Delta: account-dashboard

## MODIFIED Requirements

### Requirement: Consolidated Net Worth & Currency Breakdown
The dashboard SHALL display the user's consolidated net worth in IDR, including sub-aggregations by currency and financial institution derived from the primary account detail snapshot, using high-precision typography and tabular numbers without decorative literary serif fonts or ambient background animations.

#### Scenario: Display Consolidated Net Worth
- **WHEN** account detail data is successfully loaded
- **THEN** the dashboard displays the total consolidated net worth with live FX conversion notation and pills showing allocation across each institution.

#### Scenario: Filter Wallets by Institution Pill
- **WHEN** a user clicks on an institution pill in the Net Worth card
- **THEN** the dashboard highlights or filters to show accounts associated with that institution.

### Requirement: Executive Cockpit Operational Workbench
The dashboard SHALL provide a compact 3-column operational cockpit at `/` containing quick bank balances on the left, a live recent transaction feed in the center, and monthly allocation pacing on the right.

#### Scenario: Scan Daily Financial Cockpit
- **WHEN** user loads the home cockpit route `/`
- **THEN** user can view their entire cash position, recent transaction activity, and critical runway alerts on one screen without opening nested modals or drawers.
