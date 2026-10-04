# user-settings Specification

## Purpose
Server-persisted user preferences stored in Cloudflare D1, accessible via authenticated REST endpoints, enabling cross-device configuration persistence for the horizon board and future user-level settings.

## Requirements

### Requirement: User Settings Storage Schema
The agent backend SHALL store user-specific settings in a dedicated D1 table with JSON payload and last-modified timestamp.

#### Scenario: Settings Table Structure
- **WHEN** the D1 migration is applied
- **THEN** a `user_settings` table exists with columns: `user_id TEXT PRIMARY KEY`, `settings_json TEXT NOT NULL`, `updated_at INTEGER NOT NULL`

#### Scenario: Settings JSON Contract
- **WHEN** a settings record is read or written
- **THEN** `settings_json` parses as a JSON object conforming to `UserSettings` with fields: `ledgerViewMode` (`"single"` or `"calendar_board"`), `activePeriods` (array of `"YYYY-MM"` strings), and optional future-extensible fields (`dateStartOfMonth`, `language`, `mainCurrency`)

### Requirement: Retrieve User Settings
The agent backend SHALL serve user settings via an authenticated GET endpoint.

#### Scenario: Fetch Existing Settings
- **WHEN** authenticated client sends `GET /api/settings`
- **THEN** the server returns HTTP 200 with the user's `UserSettings` JSON object

#### Scenario: Fetch Settings for New User
- **WHEN** authenticated client sends `GET /api/settings` and no settings record exists for that `userId`
- **THEN** the server returns HTTP 200 with a default `UserSettings` object: `{ ledgerViewMode: "single", activePeriods: [] }`

#### Scenario: Unauthenticated Request
- **WHEN** client sends `GET /api/settings` without a valid Bearer token
- **THEN** the server returns HTTP 401 Unauthorized

### Requirement: Update User Settings
The agent backend SHALL persist user settings via an authenticated PUT endpoint with upsert semantics.

#### Scenario: Save New Settings
- **WHEN** authenticated client sends `PUT /api/settings` with a valid `UserSettings` JSON body
- **THEN** the server inserts or updates the record for the authenticated `userId` in `user_settings` and returns HTTP 200

#### Scenario: Partial Update Merge
- **WHEN** client sends `PUT /api/settings` with a partial `UserSettings` body (e.g. only `{ activePeriods: ["2026-10", "2026-11"] }`)
- **THEN** the server merges the provided fields with existing settings, preserving unmodified fields

#### Scenario: Invalid Payload Rejection
- **WHEN** client sends `PUT /api/settings` with a payload that is not valid JSON or contains invalid field types
- **THEN** the server returns HTTP 400 with an error message describing the validation failure
