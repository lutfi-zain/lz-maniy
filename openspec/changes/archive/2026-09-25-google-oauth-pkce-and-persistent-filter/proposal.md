# Proposal: Google OAuth 2.0 PKCE Authentication & Persistent Date Filter

## Why

Currently, Maniyy V2 operates using a static fallback API token in `.env` without user identity isolation or real session lifecycle management. Furthermore, the newly released Reedrich Engine v1.6.0 introduces zero-click Google OAuth 2.0 PKCE federation (`GET /oauth/authorize?provider=google`), allowing client applications to authenticate users directly through Google Sign-In with signed state JWTs and S256 code challenge verification. 

Additionally, date filter state across the studio pages (`/ledger`, `/accounts`, `/planning`) is currently stored in local component state; navigating between views or reloading causes the selected timeframe to reset to "Bulan Ini" unless explicitly encoded in URL query parameters. Users need a persistent, global date filter state that stays intact across route changes and only resets on manual change, explicit reset click, or logout.

## What Changes

1. **Google OAuth 2.0 PKCE Zero-Click Flow**:
   - Create a dedicated `/login` page following `minimalist-ui` and `impeccable` guidelines (warm bone `#F7F6F3` canvas, 1px `#EAEAEA` borders, Newsreader serif, solid `#111111` CTA button).
   - "Lanjutkan dengan Google" CTA generates a cryptographic PKCE `code_verifier` and SHA-256 `code_challenge`, stores verifier and anti-CSRF state in `sessionStorage`, and redirects directly to `https://reedrich-mcp.lutfidmz.workers.dev/oauth/authorize?provider=google&client_id=maniyy-web&code_challenge=...&code_challenge_method=S256&redirect_uri=.../auth/callback`.
   - Implement `/auth/callback` route to handle the Google redirect, validate state, exchange `authorization_code` via `POST /oauth/token`, and store issued `access_token` (JWT, 15m), `refresh_token`, and user profile in `localStorage`.

2. **Dual-Layer Auth Guard & Anti-FOUC**:
   - Implement route-level guard in `src/routes/+layout.svelte` with an initializing shield loader to prevent flash of unauthenticated content (FOUC).
   - Public routes (`/login`, `/auth/callback`) render a clean standalone card shell without Topbar, BottomNav, or ledger navigation.
   - Protected routes (`/`, `/ledger`, `/accounts`, `/planning`) require an active session; unauthenticated access stores the intended deep link in `sessionStorage` and redirects to `/login`.
   - Interceptor-level runtime guard automatically refreshes expired access tokens on HTTP 401 and gracefully prompts re-login if refresh fails.

3. **Persistent Date Filter State (`dateFilterStore`)**:
   - Centralize date range selection into a reactive Svelte 5 store backed by `localStorage` (`maniyy_date_filter`).
   - Retain active preset, start date, and end date across all views (Cockpit, Ledger, Accounts, Planning) and browser reloads.
   - Strict reset rules: state is reset to default ("Bulan Ini") **only** when the user explicitly clicks "Reset Filter", manually picks a new date, or logs out.

4. **Topbar User Profile & Logout Action**:
   - Display authenticated user initials/email in the Topbar with a streamlined menu.
   - Logout button wipes tokens from `localStorage`, resets `dateFilterStore`, resets `reedrichStore`, and redirects to `/login`.

## Capabilities

### New Capabilities
- `auth-session`: Google OAuth 2.0 PKCE client flow, `/login` interface, `/auth/callback` token exchange, `AuthStore` in `localStorage`, proactive JWT refresh, and dual-layer auth guard.
- `date-filter`: Global persistent date filter store (`dateFilterStore`) synchronized with `localStorage`, retaining date ranges across route navigations with explicit reset triggers.

### Modified Capabilities
- `financial-store`: Inject dynamic Bearer token from `AuthStore` into all API calls, attach 401 retry interceptor with token refresh, and handle store reset on logout.
- `account-dashboard`: Connect Topbar to user profile and logout action; wire macro KPI tiles to `dateFilterStore`.
- `ledger-studio`: Synchronize table and forecast rail to `dateFilterStore` instead of isolated local page state.

## Impact

- **User Experience**: Seamless Google sign-in without double login screens; consistent date perspective when navigating across ledger, account matrix, and planning.
- **Security**: RFC 7636 PKCE S256 verification ensures authorization codes cannot be intercepted; tokens stored client-side in `localStorage` with short 15-minute access token lifespan.
- **Compatibility**: Retains optional developer API Key fallback for offline testing or manual tokens.
- **Dependencies**: No external npm OAuth libraries required; uses native Web Crypto API (`crypto.subtle`) and standard Web Fetch API.
