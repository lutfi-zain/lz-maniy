## MODIFIED Requirements

### Requirement: Sticky Summary Card with Cashflow Liquidity Decomposition

Each period column in the Ledger Horizon Board SHALL display a sticky summary card at its bottom showing cashflow aggregates (inflow, outflow, net cashflow) along with liquidity partition metrics (`netSpendable` and `netLocked`) when available from the server horizon projections, projected net worth with temporal status labeling, and goal snapshots.

#### Scenario: Period summary displays cashflow liquidity decomposition when available
- **GIVEN** a horizon period projection containing `cashflow.net: 8971700`, `cashflow.netSpendable: 1971700`, and `cashflow.netLocked: 7000000`
- **WHEN** the period column summary card is rendered
- **THEN** the summary card MUST display:
  - "Net Cashflow" with value `+Rp 8.971.700`
  - "Inflow" and "Outflow" rows
  - A sub-breakdown row showing "Net Operasional" with green dot indicator and value `+Rp 1.971.700`
  - A sub-breakdown row showing "Net Cadangan" with amber dot indicator and value `+Rp 7.000.000`

#### Scenario: Period summary gracefully handles missing partition fields
- **GIVEN** a horizon period projection where `cashflow.netSpendable` and `cashflow.netLocked` are undefined or null
- **WHEN** the period column summary card is rendered
- **THEN** the summary card MUST display Net Cashflow, Inflow, and Outflow normally
- **THEN** the sub-breakdown rows ("Net Operasional" and "Net Cadangan") MUST NOT be rendered

#### Scenario: Period summary labels Net Worth according to temporal position
- **GIVEN** a horizon board period
- **WHEN** the period is for a future month (`periodKey > currYearMonth`)
- **THEN** the Net Worth label MUST be "PROYEKSI NET WORTH"
- **WHEN** the period is for a past month (`periodKey < currYearMonth`)
- **THEN** the Net Worth label MUST be "NET WORTH PENUTUPAN"
- **WHEN** the period is for the current month (`periodKey === currYearMonth`)
- **THEN** the Net Worth label MUST be "PROYEKSI AKHIR BULAN"
