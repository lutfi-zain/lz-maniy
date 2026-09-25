# Spec Delta: auth-session

## ADDED Requirements

### Requirement: Verified User Profile Synchronization

The application MUST query `GET /api/v1/me` (or `GET /api/v1/user/profile`) using the active session token to retrieve and persist verified user identity details.

#### Scenario: Successful Profile Hydration
- **WHEN** user session is authenticated or newly initialized
- **THEN** client sends an authenticated GET request to `/api/v1/me`
- **THEN** client parses the returned profile fields: `userId`, `firstName`, `lastName`, `fullName`, `email`, `whatsappNumber`, and `createdAt`
- **THEN** client stores the complete profile object into `authStore.user` and updates `localStorage` key `reedrich_user`

#### Scenario: Offline or Network Failure Fallback
- **WHEN** request to `/api/v1/me` fails or client is offline
- **THEN** client retains previously cached profile from `localStorage` or JWT claims without interrupting user session
