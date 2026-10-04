## 1. State Store & Filter Extension

- [x] 1.1 Extend `planningFilterStore` in `apps/web/src/lib/stores/planning-filter.svelte.ts` with `goalSortBy: 'current_amount_desc' | 'target_amount_desc' | 'name'`, defaulting to `'current_amount_desc'`.
  - **Acceptance Criteria**: `planningFilterStore.goalSortBy` is typed, reactive, reset by `resetFilters()`, and retains custom values.
  - **Verification**: `bun test apps/web/src/lib/stores/planning-filter.test.ts`

- [x] 1.2 Update unit tests in `apps/web/src/lib/stores/planning-filter.test.ts` covering `goalSortBy` default value, getter/setter reactivity, and reset behavior.
  - **Acceptance Criteria**: All store unit tests pass cleanly.
  - **Verification**: `bun test apps/web/src/lib/stores/planning-filter.test.ts`

## 2. Temporal Goal Lifecycle & Point-in-Time Resolution

- [x] 2.1 Update `resolveGoalLifecycle` in `apps/web/src/lib/utils/lifecycle.ts` to accept optional `referenceDate?: Date` and optional precomputed `overrideCurrentAmount?: number`.
  - **Acceptance Criteria**: When `overrideCurrentAmount` is provided, lifecycle progress, completion, and remaining amounts compute against that value; when `referenceDate` is provided, `daysRemaining` and `isOverdue` evaluate relative to that date.
  - **Verification**: `bun test apps/web/src/lib/utils/lifecycle.test.ts`

- [x] 2.2 Add unit test coverage in `apps/web/src/lib/utils/lifecycle.test.ts` for overdue evaluation at historical/future reference dates and point-in-time current amounts.
  - **Acceptance Criteria**: Test suite validates both default (today) and explicit `referenceDate` / `overrideCurrentAmount` scenarios.
  - **Verification**: `bun test apps/web/src/lib/utils/lifecycle.test.ts`

## 3. Planning Studio UI & Reactive Synchronization

- [x] 3.1 Implement reactive temporal synchronization in `apps/web/src/routes/planning/+page.svelte` when `activeSubTab === 'goals'`, invoking `reedrichStore.fetchWallets({ startDate, endDate }, signal)` on `dateFilterStore` updates with abort safety.
  - **Acceptance Criteria**: Selecting a date range or maximizing a period from Horizon Board dispatches temporal wallet queries and updates `reedrichStore.allWallets`.
  - **Verification**: `bun run check:web`

- [x] 3.2 Compute point-in-time `liveCurrent` and goal lifecycle in `apps/web/src/routes/planning/+page.svelte` by looking up linked wallet balances in `reedrichStore.allWallets` converted to IDR and passing `dateFilterStore.endDate` as `referenceDate`.
  - **Acceptance Criteria**: Goal cards reflect point-in-time accumulated balances and relative overdue states.
  - **Verification**: `bun run check:web`

- [x] 3.3 Implement goal sorting logic in `apps/web/src/routes/planning/+page.svelte` applying `planningFilterStore.goalSortBy`, sorting by highest accumulated `liveCurrent` descending by default.
  - **Acceptance Criteria**: Rendered goals appear in order of highest `liveCurrent` first.
  - **Verification**: `bun run check:web`

- [x] 3.4 Add minimalist sort selector dropdown to the Goals toolbar in `apps/web/src/routes/planning/+page.svelte` allowing users to switch between `Nominal Terkumpul Terbesar`, `Target Terbesar`, and `Nama A-Z`.
  - **Acceptance Criteria**: Controls bar conforms to `minimalist-ui` guidelines, binds to `planningFilterStore.goalSortBy`, and dynamically rearranges the cards.
  - **Verification**: `bun run check:web`
## 4. Verification, Integration Testing & Git Hygiene

- [x] 4.1 Run unit test suites across the web workspace to confirm zero regressions.
  - **Acceptance Criteria**: All Vitest test suites pass with 0 failures.
  - **Verification**: `bun run test:web`

- [x] 4.2 Run SvelteKit workspace type check.
  - **Acceptance Criteria**: Full workspace TypeScript and Svelte 5 runes check passes with 0 errors.
  - **Verification**: `bun run check:web`

- [x] 4.3 Run pre-commit secret hygiene checks.
  - **Acceptance Criteria**: Pre-commit secret scanning completes with 0 detected credentials.
  - **Verification**: `bun scripts/check-secrets.ts`
