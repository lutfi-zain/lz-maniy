# Tasks

## 1. Localization & Dictionary Keys

- [ ] 1.1 Update `apps/web/src/lib/i18n/types.ts` to add schema keys for `headroomLabel`, `overrunLabel`, `remainingToLimit`, `overLimitBy`, and `utilizationRatio` under `planning.budgets`.
- [ ] 1.2 Update canonical English dictionary `apps/web/src/lib/i18n/locales/en.ts` with financial English terms (`"Remaining Headroom"`, `"{amount} remaining"`, `"Over limit by {amount}"`, `"Spent / Allowance"`).
- [ ] 1.3 Update Indonesian dictionary `apps/web/src/lib/i18n/locales/id.ts` with corresponding Indonesian translations (`"Sisa Pagu"`, `"Sisa {amount} lagi"`, `"Melebihi batas {amount}"`, `"Realisasi / Batas Pagu"`).

## 2. BudgetCard Component Refactor

- [ ] 2.1 Refactor state derivations in `apps/web/src/lib/components/budgets/BudgetCard.svelte` using Svelte 5 `$derived` for `rawRemaining`, `isOver`, `isWarning`, and state-aware progress color classes (`#111111`, `#D97706`, `#9F2F2D`).
- [ ] 2.2 Rebuild the progress section markup in `BudgetCard.svelte` with the dual-layer editorial layout: progress bar with capped 100% width on overflow, primary headroom/overrun metric, and secondary spent/limit ratio.
- [ ] 2.3 Style status badges and typography adhering to *Impeccable* design principles (micro uppercase labels, tabular figures, high contrast AA).

## 3. Testing & Verification

- [ ] 3.1 Create unit test suite `apps/web/src/lib/components/budgets/__tests__/BudgetCard.test.ts` to test safe budget, warning budget, and over-budget states across locales.
- [ ] 3.2 Run Vitest unit tests (`bun run --cwd apps/web test:unit`) ensuring 100% passing suite.
- [ ] 3.3 Run SvelteKit typecheck (`bun run --cwd apps/web check`) ensuring 0 errors and 0 warnings.
- [ ] 3.4 Run production static build (`bun run --cwd apps/web build`) ensuring clean compilation.
