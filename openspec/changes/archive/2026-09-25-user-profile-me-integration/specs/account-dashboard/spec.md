# Spec Delta: account-dashboard

## ADDED Requirements

### Requirement: Verified Identity Display in Topbar and Cockpit

The application SHALL display verified user identity details in the Topbar avatar and user dropdown, and display an editorial greeting in Cockpit.

#### Scenario: Accurate Initials and Name Display
- **WHEN** user profile contains `firstName` and `lastName` (or `fullName`)
- **THEN** Topbar avatar displays two-letter initials computed from `firstName[0] + lastName[0]`
- **THEN** Topbar dropdown displays `fullName`, `email`, formatted WhatsApp number, and membership duration

#### Scenario: Cockpit Personalized Greeting
- **WHEN** user navigates to the Cockpit dashboard (`/`) with an authenticated session
- **THEN** the workspace header displays a personalized greeting reflecting the user's name
