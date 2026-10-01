# Spec Delta: ledger-studio

## ADDED Requirements

### Requirement: Horizon Period Column Pagination
The multi-period horizon column MUST support loading additional transactions beyond the initial batch to prevent truncation.

#### Scenario: Period contains more transactions than the initial limit
- **WHEN** a period column's transaction envelope indicates `pagination.hasNext === true`
- **THEN** the column MUST display an intuitive "Muat Lebih Banyak" / "Load More" action or infinite scroll sentinel
- **AND** triggering it MUST fetch the next page via `offset` and append the new transactions to the column list.

### Requirement: Cockpit Recent Ledger Click Interaction
The Cockpit recent transaction list MUST provide direct item inspection without forcing the user to switch routes.

#### Scenario: User clicks a transaction row in Cockpit
- **WHEN** the user clicks any transaction row in `CockpitRecentLedger`
- **THEN** the transaction detail and edit drawer MUST open with that transaction pre-populated
- **AND** the Cockpit view MUST remain visible in the background.
