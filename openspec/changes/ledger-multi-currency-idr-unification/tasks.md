# Tasks

## 1. Currency-Aware Timeline Calculation & Unit Tests

- [ ] 1.1 Update `calculatePointInTimeNetWorth()` in `src/lib/utils/networth-timeline.ts` to resolve wallet currencies and convert every transaction into IDR via `getConvertedBalanceInIDR()`
- [ ] 1.2 Add unit tests in `src/lib/utils/networth-timeline.test.ts` verifying future projections and past closing balances with non-IDR USDT transactions
- [ ] 1.3 Execute unit test suite with `bun test src/lib/utils/networth-timeline.test.ts` and verify all tests pass

## 2. Ledger Aggregates & UI Row Harmonization

- [ ] 2.1 Update `aggregateStats` in `src/routes/ledger/+page.svelte` to convert all filtered transaction amounts to IDR equivalents before computing income, expense, and net cashflow
- [ ] 2.2 Pass wallet currency map to `calculatePointInTimeNetWorth` call in `src/routes/ledger/+page.svelte`
- [ ] 2.3 Update transaction row rendering in `src/routes/ledger/+page.svelte` (desktop table and mobile feed) to display primary amount in IDR and secondary notation for foreign currencies
- [ ] 2.4 Update transaction row rendering in `src/lib/components/cockpit/CockpitRecentLedger.svelte` (desktop table and mobile feed) to display primary amount in IDR and secondary notation for foreign currencies

## 3. End-to-End Testing & Automated Quality Verification

- [ ] 3.1 Create Playwright E2E test in `tests/ledger-multi-currency.spec.ts` asserting converted IDR amounts and summary strip calculations
- [ ] 3.2 Execute full test suite (`bun run test:unit && bun run test:e2e`)
- [ ] 3.3 Run type checker and linter (`bun run check && bun run lint`) and verify 0 errors and 0 warnings
- [ ] 3.4 Build static production bundle (`bun run build`) and verify build artifacts
