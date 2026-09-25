# Tasks

## 1. Type Definitions & Store Integration

- [x] 1.1 Add `UserProfileDTO` to `src/lib/types/account-detail.ts`
- [x] 1.2 Implement `fetchUserProfile()` in `src/lib/stores/reedrich.svelte.ts` calling `GET /api/v1/me`
- [x] 1.3 Add `setUserProfile()` to `src/lib/stores/auth.svelte.ts` updating `authStore.user` and persisting to `localStorage`
- [x] 1.4 Add unit tests in `src/lib/stores/reedrich.test.ts` verifying profile fetch and store hydration

## 2. App Lifecycle & Hydration Trigger

- [x] 2.1 Trigger `fetchUserProfile()` in `src/routes/+layout.svelte` on mount when authenticated
- [x] 2.2 Trigger `fetchUserProfile()` in `src/routes/auth/callback/+page.svelte` and manual key login following token exchange

## 3. Topbar & Cockpit UI Personalization

- [x] 3.1 Update `Topbar.svelte` avatar initials and dropdown to show full name, WhatsApp number, and membership duration
- [x] 3.2 Update `src/routes/+page.svelte` (Cockpit) to display personalized greeting reflecting user name

## 4. Automated Verification & Static Production Build

- [x] 4.1 Update Playwright E2E test in `tests/auth-flow.spec.ts` verifying profile display in Topbar
- [x] 4.2 Execute full test suite (`bun run test:unit && bun run test:e2e`)
- [x] 4.3 Run type checker and linter (`bun run check && bun run lint`) and verify 0 errors and 0 warnings
- [x] 4.4 Build static production bundle (`bun run build`)
