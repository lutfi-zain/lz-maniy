# Spec Delta

## ADDED Requirements

### Requirement: Server-Driven Horizon Board Projections
The Ledger Horizon Board SHALL obtain per-period Net Worth, Spendable, and Committed values from the server-computed roll-forward projection endpoint (`GET /api/v1/analytics/horizon`) rather than calculating them client-side from a local transaction dataset.

#### Scenario: Horizon Board Displays Server-Projected Net Worth
- **WHEN** user switches to the Horizon Board view on `/ledger` with periods spanning future months
- **THEN** each period column's `PeriodSummaryCard` displays the server-computed `netWorth.total`, `netWorth.spendable`, and `netWorth.locked` values
- **AND** consecutive future months with positive net cashflow display monotonically increasing Net Worth values.

#### Scenario: Horizon Board Cashflow Uses Period Column Data
- **WHEN** the Horizon Board renders a period column
- **THEN** the cashflow section (Inflow, Outflow, Net) continues to derive from the column's locally-fetched period transactions
- **AND** the Net Worth section derives from the server horizon projection for that period.

#### Scenario: Server Projection Failure Degrades Visibly
- **WHEN** the `fetchHorizonProjections()` call fails (network error, timeout, or non-2xx response)
- **THEN** the Horizon Board displays a visible indicator that projections are unavailable
- **AND** does NOT silently fall back to stale or zero-delta calculations.

### Requirement: Server-Driven List View Net Worth Anchor
The Ledger List View right-zone Net Worth anchor SHALL obtain projected and historical Net Worth values from a server-computed source rather than a client-side calculation over a local transaction dataset.

#### Scenario: Future Date Filter Shows Server-Projected Net Worth
- **WHEN** user filters the ledger to a future date range (e.g., "Bulan Depan" or a custom future end date)
- **THEN** the right-zone anchor displays `PROYEKSI NET WORTH` with the server-computed projected amount
- **AND** the projected amount reflects all planned transactions between today and the filter end date.

#### Scenario: Historical Date Filter Shows Correct Closing Net Worth
- **WHEN** user filters the ledger to a past date range (e.g., "Bulan Lalu")
- **THEN** the right-zone anchor displays `NET WORTH PENUTUPAN` with the server-computed historical closing amount
- **AND** the closing amount reflects the portfolio state at the end of that historical period.

#### Scenario: Present Month Shows Live Net Worth
- **WHEN** user views the default "Bulan Ini" or "Semua Waktu" filter
- **THEN** the right-zone anchor displays `NET WORTH SAAT INI` with the live consolidated net worth from the snapshot
- **AND** Spendable and Committed breakdown reflects live wallet locked status.
