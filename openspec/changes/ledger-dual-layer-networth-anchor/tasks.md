# Tasks

- [x] 1.1 Implement `calculatePointInTimeNetWorth()` in `src/lib/utils/networth-timeline.ts` supporting future projections, present consolidated liquidity, and historical closing balances based on ending horizon $T_{\text{akhir}}$
- [x] 1.2 Create unit tests in `src/lib/utils/networth-timeline.test.ts` validating all three time horizons and confirming filter narrowing invariance
- [x] 1.3 Execute unit test suite with `bun test src/lib/utils/networth-timeline.test.ts` and verify all test cases pass

## 2. Ledger Studio Dual-Layer Summary Strip Integration

- [x] 2.1 Refactor summary strip in `src/routes/ledger/+page.svelte` to implement the dual-layer layout separating Local Filter Scope (left) from Global Balance Sheet Anchor (right)
- [x] 2.2 Bind reactive point-in-time calculation to active filter date boundaries (`filterStartDate`, `filterEndDate`) and full transaction history
- [x] 2.3 Style responsive layout according to `minimalist-ui` guidelines with desktop horizontal split and mobile stacked presentation

## 3. End-to-End Testing & Quality Verification

- [x] 3.1 Create Playwright E2E test in `tests/ledger-dual-layer.spec.ts` testing future projection display under "Bulan Depan", present liquidity under "Bulan Ini", and category filter invariance
- [x] 3.2 Execute full test suite (`bun run test:unit && bun run test:e2e`) and ensure all tests pass
- [x] 3.3 Run type checker and linter (`bun run check && bun run lint`) and verify 0 errors and 0 warnings
- [x] 3.4 Build static production bundle (`bun run build`) and verify build artifacts
