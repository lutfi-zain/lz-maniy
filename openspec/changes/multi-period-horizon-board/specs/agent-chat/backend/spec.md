# Spec Delta

## ADDED Requirements

### Requirement: User Settings REST Endpoints
The agent backend SHALL expose authenticated endpoints for reading and writing user-level settings to D1.

#### Scenario: Settings Route Registration
- **WHEN** the Hono app initializes
- **THEN** `GET /api/settings` and `PUT /api/settings` are registered under the settings router with `authMiddleware` applied

#### Scenario: GET Returns Stored or Default Settings
- **WHEN** authenticated client sends `GET /api/settings`
- **THEN** the backend queries `user_settings` by `userId` and returns the stored JSON, or `{ ledgerViewMode: "single", activePeriods: [] }` if no record exists

#### Scenario: PUT Upserts Settings
- **WHEN** authenticated client sends `PUT /api/settings` with a JSON body
- **THEN** the backend validates the payload, merges with existing settings (if any), and executes `INSERT ... ON CONFLICT(user_id) DO UPDATE` against `user_settings`
