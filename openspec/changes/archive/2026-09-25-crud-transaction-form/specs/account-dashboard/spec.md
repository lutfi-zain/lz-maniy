# account-dashboard Spec Delta

## ADDED Requirements

### Requirement: Global Create Transaction Triggers
The application shell SHALL provide always-visible triggers to open the transaction form from any route.

#### Scenario: Topbar Create Button on Desktop
- **WHEN** user is authenticated and viewing any protected route on desktop (>= 768px)
- **THEN** a `[+ Catat]` button is visible in the Topbar's right action area
- **THEN** clicking it opens the transaction form drawer in create mode

#### Scenario: BottomNav Center Action on Mobile
- **WHEN** user is authenticated and viewing any protected route on mobile (< 768px)
- **THEN** a center action button (visually distinct from navigation tabs) is present in the BottomNav between the Ledger and Akun tabs
- **THEN** tapping it opens the transaction form drawer in create mode
