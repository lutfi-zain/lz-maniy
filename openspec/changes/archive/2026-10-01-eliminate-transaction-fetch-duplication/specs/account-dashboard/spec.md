# Spec Delta: account-dashboard

## ADDED Requirements

### Requirement: Deduplicated Cockpit Feed Requests
The cockpit recent-transactions feed SHALL issue at most one in-flight network request per distinct filter state, cancelling superseded requests instead of duplicating them.

#### Scenario: Single Request Per Filter State
- **WHEN** the cockpit mounts or the active date range changes
- **THEN** any prior in-flight feed request is aborted before a new one starts
- **AND** the network log shows exactly one `/api/v1/transactions` request for that filter state.

#### Scenario: Rapid Navigation Cancels Stale Feed
- **WHEN** the user navigates away from the cockpit while its feed request is still in flight
- **THEN** the orphaned request is aborted and its late response never overwrites newer state.
