# Spec Delta

## ADDED Requirements

### Requirement: Arbitrary Date Interval Horizon Projections Querying
The financial store SHALL support querying forward-looking multi-period projections for arbitrary start and end date intervals in addition to whole calendar months.

#### Scenario: Query Horizon Projections with Custom Date Intervals
- **WHEN** `fetchHorizonProjections(periods)` is called with an array containing date intervals (e.g., `['2026-09-25_2026-10-24', '2026-10-25_2026-11-24']` or `[['2026-09-25', '2026-10-24']]`)
- **THEN** the store serializes the intervals into a 2D JSON array query parameter `periods=[["2026-09-25","2026-10-24"],...]`
- **AND** dispatches the request to `GET /api/v1/analytics/horizon`
- **AND** returns the typed `HorizonBoardDTO` with periods indexed by their interval keys.
