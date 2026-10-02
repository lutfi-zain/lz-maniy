# Spec Delta

## MODIFIED Requirements

### Requirement: Temporal Snapshot Querying with Date Bounds

The store SHALL pass `startDate` and `endDate` when querying supported date-bounded account reports. The account overview SHALL preserve the current Reedrich contract: its realized cashflow is selected-period data, its budget collection intersects the selected period, and its net worth, wallet capital, and linked-goal capital are live values. Historical wallet capital SHALL be obtained from point-in-time wallet snapshots rather than inferred from the live account overview. Calendar-period queries SHALL include their intended first and final instants without double-counting adjacent periods.

#### Scenario: Synchronize Account Detail Snapshot with Date Range
- **WHEN** the user selects a timeframe such as September 1 through September 30
- **THEN** the account-detail request includes date bounds that cover the intended calendar period
- **AND** the store consumes realized cashflow for that period and the overlapping budget collection
- **AND** live net worth, wallet capital, and linked-goal amounts are not falsely presented as reconstructed historical closing balances.

#### Scenario: Historical Wallet Capital Uses Point-in-Time Snapshot
- **WHEN** a historical wallet or account view needs its selected period's opening, movement, or closing balance
- **THEN** it uses the date-bounded wallet snapshot fields for that period
- **AND** it does not substitute a live `walletBalance` or live account-overview total for the requested historical value.

#### Scenario: Calendar Boundary Values Are Not Lost
- **WHEN** a selected calendar period contains transactions at its first and final valid UTC instants
- **THEN** both are included in the intended period report
- **AND** a transaction at the following period's first instant is excluded.
