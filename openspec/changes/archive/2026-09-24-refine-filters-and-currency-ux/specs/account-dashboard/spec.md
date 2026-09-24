# Spec Delta: account-dashboard

## MODIFIED Requirements

### Requirement: Executive Cockpit Operational Workbench
The dashboard SHALL provide a compact 3-column operational cockpit at `/` containing quick bank balances on the left, a date-filterable live recent transaction feed in the center using the shared DateRangePicker component, and monthly allocation pacing on the right.

#### Scenario: Filter Recent Mutations by Date Range on Cockpit
- **WHEN** user changes the date range preset (e.g. to "Bulan Ini" or "Bulan Depan") in the Cockpit workbench
- **THEN** the recent mutations feed filters dynamically to transactions within that date range.

### Requirement: Standardized Status Indicators & Multi-Currency Aggregations
The dashboard SHALL display account and reserve statuses using a unified visual language (amber lock icon for Cadangan, green dot for Operasional) and compute all total asset values by converting foreign currency balances (USDT/USD) into IDR using live exchange rates/pegs.

#### Scenario: Uniform Status Display
- **WHEN** viewing account status indicators on the cockpit
- **THEN** spendable operational cash is consistently marked with a green indicator and locked reserve cash is marked with an amber lock icon.

#### Scenario: Multi-Currency Total Asset Conversion
- **WHEN** calculating total net worth or total asset holdings
- **THEN** foreign currency balances (such as Bitget USDT) are automatically converted to IDR and included in the grand total.
