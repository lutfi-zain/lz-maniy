# Spec Delta

## ADDED Requirements

### Requirement: Ledger Horizon Value Integrity Assertion
The E2E suite MUST verify that the Ledger Horizon Board displays numerically distinct Net Worth projections across consecutive future periods whenever nonzero net cashflow exists.

#### Scenario: Projected Net Worth Differs Across Horizon Periods
- **WHEN** the test account has planned transactions producing nonzero net cashflow in future months
- **AND** the Ledger Horizon Board is displayed
- **THEN** the Net Worth value in the M+2 period column differs from the M+1 period column
- **AND** neither M+1 nor M+2 Net Worth equals the present-month "NET WORTH SAAT INI" value.

#### Scenario: Ledger List View Projection Differs From Present
- **WHEN** the ledger date filter is set to a future month with nonzero planned cashflow
- **THEN** the right-zone `PROYEKSI NET WORTH` amount differs from the `NET WORTH SAAT INI` amount shown under the default "Bulan Ini" filter.

#### Scenario: Ledger Horizon Agrees With Backend Horizon API
- **WHEN** the `/api/v1/analytics/horizon` endpoint returns a Net Worth total for a given period
- **AND** the Ledger Horizon Board displays that same period
- **THEN** the displayed Net Worth value matches the API-computed value within IDR currency precision.
