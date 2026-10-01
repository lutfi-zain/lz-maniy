# Proposal: Integrate Reedrich v1.16.0 Summary & Safe-to-Spend Runway into Cockpit

## Why

Reedrich Financial Intelligence API v1.16.0 introduced `GET /api/v1/summary`, providing a mathematical Safe-to-Spend Runway that factors in upcoming planned expenses, 30-day recurring commitments, and active debt obligations, alongside forward-looking cashflow projections. Currently, Maniyy's Cockpit displays nominal spendable wallet balance instead of the true safe-to-spend runway, relies on a fragile hardcoded string check (`sewa rumah`) for alert banners, and lacks operational actions to realize planned recurring transactions or visualize upcoming commitments.

Integrating the v1.16.0 summary engine transforms the Cockpit into a true forward-looking financial workbench with deterministic runway alerts, upcoming bill timelines, and one-tap planned transaction realization.

## What Changes

- **Summary State in Store**: Add `summary` reactive state rune and `fetchSummary()` method in `ReedrichStore` backed by `GET /api/v1/summary` and normalized in `AccountDetail` snapshots.
- **True Safe-to-Spend KPI**: Update `CockpitKpiStrip.svelte` to display true `safeToSpend` runway and `dailySafeToSpend` allowance, with a distinct monochrome deficit badge when `safeToSpendDetails.isDeficit` is true.
- **Dynamic Runway & Pacing Alert Banner**: Refactor `CockpitAlertBanner.svelte` to eliminate hardcoded "sewa rumah" text searches, dynamically surfacing true runway deficit alerts and critical goal pacing from live summary data.
- **30-Day Forward Cashflow Timeline Widget**: Add an executive upcoming commitments widget in Cockpit rendering scheduled bills and income events from `summary.cashflowProjections.events` with lookahead totals.
- **Planned Recurring Transaction Realization**: Enable one-tap "Terapkan / Bayar" action on planned occurrences in Cockpit's Recent Ledger using `POST /api/v1/recurring-templates/{templateId}/apply`.
- **Debt & Loan Repayment Store Method**: Add `repayDebtLoan()` to `ReedrichStore` calling `POST /api/v1/debts-loans/{debtLoanId}/repay` with atomic wallet balance deduction support.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `account-dashboard`: Update Cockpit KPI strip with true safe-to-spend runway, dynamic runway deficit alerts, 30-day forward cashflow projections, and planned transaction realization.
- `financial-store`: Extend `ReedrichStore` with summary synchronization (`GET /api/v1/summary`), debt repayment (`POST /api/v1/debts-loans/{id}/repay`), and recurring realization (`POST /api/v1/recurring-templates/{id}/apply`).

## Impact

- **Dependencies**: Zero new runtime dependencies; uses existing Svelte 5 reactive runes and native fetch.
- **Database/Storage**: Frontend-only integration; all state persistence and calculations are managed by Reedrich API.
- **Breaking Changes**: None. Additive store properties with fallback defaults maintain full backwards compatibility with existing mock data and cached snapshots.
