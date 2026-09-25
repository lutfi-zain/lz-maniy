# Tasks

## 1. Cryptographic PKCE Engine & Utilities

- [x] 1.1 Implement PKCE utilities in `src/lib/utils/pkce.ts` (`generateVerifier`, `generateChallenge`, `generateState`) using native Web Crypto API
- [x] 1.2 Add unit tests in `src/lib/utils/pkce.test.ts` and verify RFC 7636 conformance with `bun test src/lib/utils/pkce.test.ts`

## 2. Authentication Store & Token Lifecycle

- [x] 2.1 Implement `authStore` in `src/lib/stores/auth.svelte.ts` managing `localStorage` tokens (`access_token`, `refresh_token`, `expires_at`), user profile, and reactive status
- [x] 2.2 Add unit tests in `src/lib/stores/auth.test.ts` covering token storage, refresh calculations, and logout purge
- [x] 2.3 Update `reedrichStore` in `src/lib/stores/reedrich.svelte.ts` to consume dynamic Bearer token from `authStore` and support token refresh retry on HTTP 401

## 3. Persistent Date Filter State Store

- [x] 3.1 Implement `dateFilterStore` in `src/lib/stores/date-filter.svelte.ts` with `localStorage` synchronization (`maniyy_date_filter`)
- [x] 3.2 Add unit tests in `src/lib/stores/date-filter.test.ts` validating persistence, cross-view preservation, and explicit reset
- [x] 3.3 Connect `dateFilterStore` to `DateRangePicker.svelte`, `/ledger`, `/accounts`, and `/planning`, adding a dedicated "Reset Filter" button

## 4. Minimalist Login Page & OAuth Callback Handling

- [x] 4.1 Create `/login` route in `src/routes/login/+page.svelte` adhering to `minimalist-ui` and `impeccable` guidelines (warm bone `#F7F6F3` canvas, 1px `#EAEAEA` borders, Newsreader serif, solid `#111111` Google button)
- [x] 4.2 Create `/auth/callback` route in `src/routes/auth/callback/+page.svelte` handling state verification, authorization code exchange via `POST /oauth/token`, and target redirection
- [x] 4.3 Implement Dual-Layer Auth Guard and anti-FOUC shield loader in `src/routes/+layout.svelte` to isolate public from protected views
- [x] 4.4 Update `Topbar.svelte` to display authenticated user profile/avatar and provide a dropdown logout action

## 5. End-to-End Verification & Automated Quality Assurance

- [x] 5.1 Create Playwright E2E test in `tests/auth-flow.spec.ts` verifying unauthenticated redirection to `/login`, Google redirect URL formation, and logout
- [x] 5.2 Create Playwright E2E test in `tests/persistent-filter.spec.ts` verifying date preservation across route transitions and reset triggers
- [x] 5.3 Execute full test suite (`bun run test:unit && bun run test:e2e`)
- [x] 5.4 Run type checker and linter (`bun run check && bun run lint`) and verify 0 errors and 0 warnings
- [x] 5.5 Build static production bundle (`bun run build`)
