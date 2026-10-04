## 1. State Store Schema & Mapping

- [x] 1.1 Update `RawWalletEntry` interface in `apps/web/src/lib/stores/reedrich.svelte.ts` to include optional point-in-time `snapshot` schema with `totalBalance`, `initialBalance`, `periodDelta`, `totalIn`, and `totalOut`.
- [x] 1.2 Update `fetchWallets()` mapping in `apps/web/src/lib/stores/reedrich.svelte.ts` to prioritize `w.snapshot?.totalBalance ?? w.walletBalance ?? w.balance ?? 0`.

## 2. Unit Testing & Verification

- [x] 2.1 Add unit test in `apps/web/src/lib/stores/reedrich.test.ts` verifying that `fetchWallets` with `startDate` and `endDate` parameters correctly maps `snapshot.totalBalance` to `WalletItem.balance`.
- [x] 2.2 Add unit test in `apps/web/src/lib/stores/reedrich.test.ts` verifying that `fetchWallets` without date parameters falls back to `w.walletBalance`.
- [x] 2.3 Run Vitest suite via `bun test apps/web/src/lib/stores/reedrich.test.ts` and verify all tests pass cleanly.

## 3. End-to-End & Type Validation

- [x] 3.1 Run type checking via `bun run check:web` and verify zero errors.
- [x] 3.2 Perform interactive validation in browser across `/accounts` verifying that selecting *Last Month*, *This Month*, and *Next Month* updates wallet balances, bank group subtotals, and macro summary tiles.
