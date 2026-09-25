# Proposal: Reedrich /me User Profile Integration

## Why

Currently, Maniyy V2 constructs user identity only by parsing rudimentary JWT claims or falling back to "User", leaving out the user's verified full name, phone number, and account membership metadata. With the release of Reedrich v1.8.0, the backend exposes sanitized user profile endpoints at `GET /api/v1/me` (and semantic alias `GET /api/v1/user/profile`), allowing the frontend to retrieve verified user identity data (`userId`, `firstName`, `lastName`, `fullName`, `email`, `whatsappNumber`, `createdAt`) across both OAuth and API key sessions.

## What Changes

1. **Type Contract Definition**:
   - Define `UserProfileDTO` interface in `src/lib/types/account-detail.ts` reflecting the Reedrich v1.8.0 schema.

2. **Store Profile Sync (`reedrichStore` & `authStore`)**:
   - Add `fetchUserProfile()` to `ReedrichStore` calling `GET /api/v1/me` using the authenticated `request()` pipeline with automatic 401 retry.
   - Extend `AuthStore` to store verified `UserProfileDTO` fields into `this.user` and persist them to `localStorage` (`reedrich_user`).
   - Trigger `fetchUserProfile()` during app initialization in `src/routes/+layout.svelte` and immediately following successful authentication in `/auth/callback` or manual API key login.

3. **Topbar & Cockpit Personalization (`minimalist-ui`)**:
   - Update `Topbar.svelte` user avatar initials to derive from `firstName[0] + lastName[0]` (e.g. `LZ` for Lutfi Zain).
   - Expand the Topbar profile dropdown to display `fullName`, `whatsappNumber`, and formatted membership duration (`Anggota sejak Agustus 2026`).
   - Update `src/routes/+page.svelte` (Cockpit) to render an editorial greeting reflecting the user's name.

## Capabilities

### Modified Capabilities
- `auth-session`: Augment session state with verified user profile synchronization from `GET /api/v1/me`.
- `account-dashboard`: Enhance Topbar and Cockpit header with verified user profile details, contact information, and membership metadata.

## Impact

- **User Experience**: Warmer, personalized editorial interface matching `minimalist-ui` standards with verified name and contact information.
- **Security**: Endpoint only returns sanitized public user profile fields, strictly excluding sensitive hash data (`userApiKeyHash`).
- **Resilience**: Retains graceful offline/mock fallback when API is unreachable.
