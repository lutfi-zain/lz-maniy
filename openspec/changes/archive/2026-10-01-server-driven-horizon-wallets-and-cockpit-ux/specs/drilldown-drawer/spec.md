# Spec Delta: drilldown-drawer

## ADDED Requirements

### Requirement: Transaction Drawer Pagination Controls
The transaction drawer table MUST support paginated navigation when an entity's transactions exceed the default display limit.

#### Scenario: Transaction list exceeds page limit
- **WHEN** the returned transaction envelope contains `pagination.totalPages > 1` or `hasNext: true`
- **THEN** the drawer table MUST render responsive pagination controls allowing navigation to the next or previous page
- **AND** requesting the next page MUST fetch the corresponding offset without closing the drawer.

#### Scenario: Filtering transactions within drawer
- **WHEN** the user types into the drawer search input
- **THEN** the drawer MUST filter the transactions instantaneously while preserving the current drawer state.
