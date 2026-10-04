## 1. Horizon Matrix Table Refactoring

- [x] 1.1 In `apps/web/src/lib/components/goals/GoalsHorizonBoard.svelte`, implement reactive data pivoting `matrixRows` that maps each goal from `activeGoals` against all ordered periods from `periodData`.
  - **Acceptance Criteria**: Each row contains `goal: GoalSnapshot` and array of `MatrixCell` objects with point-in-time `currentAmount`, `progressPercentage`, `isReached`, `isMilestone`, and `isOverdue`.
  - **Verification**: `bun run check:web`

- [x] 1.2 In `apps/web/src/lib/components/goals/GoalsHorizonBoard.svelte`, replace the card grid markup with an ultra-compact table matrix featuring a frozen first column (`sticky left-0 bg-white border-r border-[#EAEAEA]`).
  - **Acceptance Criteria**: Sticky first column pins Goal Name and Target Amount on the left while period columns scroll horizontally.
  - **Verification**: `bun run check:web`

- [x] 1.3 In `apps/web/src/lib/components/goals/GoalsHorizonBoard.svelte`, render high-density 2-line cells without progress bars or linked wallet breakdowns, with interactive row clicking that invokes `openGoalDrawer`.
  - **Acceptance Criteria**: Cells display Line 1 (status/percent/milestone) and Line 2 (accumulated balance tabular IDR), and clicking a row opens `GoalDrawerContent`.
  - **Verification**: `bun run check:web`

## 2. Universal Mobile & Viewport Accessibility

- [x] 2.1 In `apps/web/src/routes/planning/+page.svelte`, update the List vs Horizon view mode switcher class from `hidden lg:inline-flex` to `inline-flex`.
  - **Acceptance Criteria**: View switcher renders across all viewport sizes, including mobile phones and Android desktop-mode viewports.
  - **Verification**: `bun run check:web`

- [x] 2.2 In `apps/web/src/routes/planning/+page.svelte`, remove the `!isMobile` guard from the Horizon Board conditional rendering.
  - **Acceptance Criteria**: Toggling to `horizon` renders `GoalsHorizonBoard` on both mobile and desktop screens.
  - **Verification**: `bun run check:web`

## 3. Verification & Git Hygiene

- [x] 3.1 Run web unit test suites to confirm zero regressions.
  - **Acceptance Criteria**: All unit test suites pass with 0 failures.
  - **Verification**: `bun run test:web`

- [x] 3.2 Run SvelteKit full workspace type check.
  - **Acceptance Criteria**: Svelte 5 runes and TypeScript checks pass with 0 errors.
  - **Verification**: `bun run check:web`

- [x] 3.3 Run pre-commit secret hygiene scan.
  - **Acceptance Criteria**: Secret scan passes with 0 findings.
  - **Verification**: `bun scripts/check-secrets.ts`
