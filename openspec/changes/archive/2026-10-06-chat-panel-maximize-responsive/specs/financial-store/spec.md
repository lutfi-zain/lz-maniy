## MODIFIED Requirements

### Requirement: Global Sync Refetches Active Page

The Topbar Sync control SHALL refetch the data query of the currently active page (route + date filter) with cache clearing, instead of only reloading the global snapshot. Sync SHALL provide visible feedback while in flight and record the last-sync outcome.

#### Scenario: Sync refetches the active ledger query
- **GIVEN** the user is on `/ledger` with an active date filter and transaction filters
- **WHEN** the user activates Sync
- **THEN** the active transaction query MUST be re-executed against the server with the current filters
- **THEN** the transaction table MUST reflect fresh server data

#### Scenario: Sync refetches the active accounts query
- **GIVEN** the user is on `/accounts` with an active date range
- **WHEN** the user activates Sync
- **THEN** the wallet list query MUST be re-executed with the current date range

#### Scenario: Sync refetches the active planning queries
- **GIVEN** the user is on `/planning` with an active sub-tab
- **WHEN** the user activates Sync
- **THEN** the entity queries for the active sub-tab (budgets, goals, or obligations) MUST be re-executed

#### Scenario: Sync clears stale caches before refetching
- **GIVEN** cached transaction or entity data exists
- **WHEN** the user activates Sync
- **THEN** relevant caches MUST be cleared before the refetch so no stale rows survive

#### Scenario: Sync shows in-flight and completed states
- **WHEN** Sync is in flight
- **THEN** the Sync control MUST show a loading indicator and be disabled
- **WHEN** Sync completes
- **THEN** the last-sync outcome MUST be observable (timestamp or status), distinct from "nothing happened"

### Requirement: Post-Mutation Refresh Covers All Collections

After every successful create, update, or delete mutation, the store SHALL refresh all entity collections affected by financial state (snapshot, wallets, recurring templates, budgets, goals, debts/loans) with cache clearing, so no workbench displays stale data without requiring tab navigation.

#### Scenario: Budget mutation refreshes budget list without tab switch
- **GIVEN** the user edits a budget while on the Planning Budgets tab
- **WHEN** the mutation succeeds
- **THEN** the budget list MUST reflect the updated values without requiring tab navigation

#### Scenario: Goal mutation refreshes goal list without tab switch
- **GIVEN** the user edits a goal while on the Planning Goals tab
- **WHEN** the mutation succeeds
- **THEN** the goal list MUST reflect the updated values without requiring tab navigation

#### Scenario: Obligation data refreshes after related mutations
- **GIVEN** a mutation affecting debts, loans, or recurring templates succeeds
- **WHEN** the refresh completes
- **THEN** the obligations workbench MUST reflect current server state
