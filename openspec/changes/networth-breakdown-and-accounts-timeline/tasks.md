# Tasks

## 1. Timeline Calculation Engine & Unit Tests

- [ ] 1.1 Update `calculatePointInTimeNetWorth()` in `src/lib/utils/networth-timeline.ts` to calculate and return `spendableAmount` and `lockedAmount` across future, present, and past horizons
- [ ] 1.2 Implement `calculatePointInTimeWalletBalances()` in `src/lib/utils/networth-timeline.ts` computing per-wallet timeline balances accounting for incomes, expenses, and intra-wallet transfers
- [ ] 1.3 Add unit tests in `src/lib/utils/networth-timeline.test.ts` validating spendable vs locked breakdown and per-wallet timeline balances
- [ ] 1.4 Execute unit tests (`bun test src/lib/utils/networth-timeline.test.ts`) and verify all pass

## 2. Ledger Studio Breakdown Presentation

- [ ] 2.1 Update Right Zone anchor in `src/routes/ledger/+page.svelte` to display spendable vs locked breakdown on desktop and compact 2-column bar on mobile
- [ ] 2.2 Add `Rincian Akun →` action link in ledger right zone with active date preset parameter (`/accounts?datePreset=...`)

## 3. Account Matrix Timeline Transformation

- [ ] 3.1 Integrate `DateRangePicker` into controls bar in `src/routes/accounts/+page.svelte` and parse incoming `datePreset` URL query parameter
- [ ] 3.2 Wire `calculatePointInTimeWalletBalances()` to reactive wallet rendering, updating individual wallet balances and reactive institution subtotals
- [ ] 3.3 Update accounts KPI summary tiles to reflect timeline-projected spendable, locked, and total net worth

## 4. End-to-End Testing & Automated Quality Verification

- [ ] 4.1 Create Playwright E2E test in `tests/accounts-timeline.spec.ts` testing ledger-to-accounts navigation, date range timeline balance recomputations, and spendable/locked filter isolation
- [ ] 4.2 Execute full test suite (`bun run test:unit && bun run test:e2e`)
- [ ] 4.3 Run type checker and linter (`bun run check && bun run lint`) and verify 0 errors and 0 warnings
- [ ] 4.4 Build static production bundle (`bun run build`) and verify build artifacts
