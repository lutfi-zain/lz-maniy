# Spec Delta: auth-session

## Purpose

Provides secure user identity authentication via Google OAuth 2.0 PKCE zero-click federation with the Reedrich Edge Engine, managing token storage, proactive refresh, dual-layer client routing guards, and session termination.

## ADDED Requirements

### Requirement: Direct Google OAuth 2.0 PKCE Authorization Handshake

The application MUST initiate OAuth 2.0 authorization using PKCE S256 and parameter `provider=google` to bypass intermediate consent pages, directing the user straight to Google Sign-In.

#### Scenario: Initiating Google Sign-In
- **WHEN** user clicks "Lanjutkan dengan Google" on the `/login` route
- **THEN** client generates a cryptographically random code verifier (43-128 characters) and SHA-256 code challenge
- **THEN** client stores the verifier and an anti-CSRF state token in browser `sessionStorage`
- **THEN** client redirects the browser directly to `GET /oauth/authorize` on Reedrich Edge with parameters `response_type=code`, `client_id=maniyy-web`, `code_challenge`, `code_challenge_method=S256`, `provider=google`, `scope=mcp`, and `redirect_uri`

#### Scenario: Direct Google IdP Redirection
- **WHEN** Reedrich receives the authorization request with `provider=google` and valid PKCE parameters
- **THEN** Reedrich returns an immediate HTTP 302 Found redirecting to `https://accounts.google.com/o/oauth2/v2/auth` without rendering any intermediate Reedrich HTML consent form

---

### Requirement: Authorization Code Exchange and Storage

The application MUST handle redirection back to `/auth/callback`, validate state integrity, exchange the authorization code for JWT tokens via `POST /oauth/token`, and persist session credentials.

#### Scenario: Successful Token Exchange
- **WHEN** Google redirects back to Reedrich callback and Reedrich redirects back to `/auth/callback?code=...&state=...`
- **THEN** client validates that incoming `state` matches the value previously saved in `sessionStorage`
- **THEN** client reads `code_verifier` from `sessionStorage` and immediately removes it from `sessionStorage`
- **THEN** client issues a `POST /oauth/token` request with `grant_type=authorization_code`, `client_id=maniyy-web`, `code`, `redirect_uri`, and `code_verifier`
- **THEN** client receives HTTP 200 with `access_token` (15m JWT), `refresh_token`, and `expires_in`
- **THEN** client stores tokens and calculated `expires_at` timestamp in `localStorage`
- **THEN** client redirects the user to the originally requested URL from `sessionStorage` (or `/` by default)

#### Scenario: CSRF or State Mismatch
- **WHEN** callback URL parameters contain an invalid or missing `state`
- **THEN** client aborts code exchange, clears temporary OAuth storage, and redirects to `/login?error=state_mismatch` with a clear security alert

---

### Requirement: Dual-Layer Route and Runtime Auth Guard

The application MUST protect private dashboard routes from unauthenticated viewing and gracefully handle token expiration without jarring disruptions.

#### Scenario: Unauthenticated Access to Protected Routes
- **WHEN** an unauthenticated visitor attempts to navigate to `/`, `/ledger`, `/accounts`, or `/planning`
- **THEN** client-side layout guard displays an initializing shield without rendering private financial data (anti-FOUC)
- **THEN** client records the target pathname and query parameters in `sessionStorage`
- **THEN** client redirects browser to `/login` with `replaceState: true`

#### Scenario: Authenticated User Visiting Login Route
- **WHEN** a user with a valid, active session visits `/login`
- **THEN** client layout guard automatically redirects the user to `/` (Cockpit)

#### Scenario: Proactive and Reactive Token Refresh
- **WHEN** an API request is made when the access token has less than 60 seconds remaining or receives HTTP 401
- **THEN** client issues `POST /oauth/token` with `grant_type=refresh_token` and the stored `refresh_token`
- **THEN** client updates `access_token` and `expires_at` in `localStorage` and retries the original request seamlessly
- **THEN** if refresh fails (refresh token expired or revoked), client wipes session storage and redirects to `/login?session_expired=1`

---

### Requirement: Session Termination and Complete Storage Purge

The application MUST provide a clear logout action in the Topbar that completely clears authenticated identity and sensitive local caches.

#### Scenario: User Initiates Logout
- **WHEN** authenticated user selects "Keluar" (Logout) from the Topbar user menu
- **THEN** client removes `reedrich_access_token`, `reedrich_refresh_token`, `reedrich_expires_at`, and `reedrich_user` from `localStorage`
- **THEN** client resets `reedrichStore` back to unauthenticated/mock defaults
- **THEN** client resets `dateFilterStore` back to default
- **THEN** client navigates to `/login`
