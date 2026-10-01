# Tasks

## 1. Store Pipeline Hardening & Termination of While Loop

- [x] 1.1 Replace the unbounded `while (true)` pagination loop in `reedrichStore.fetchAllTransactions()` with a deprecated no-op shim logging a dev warning.
- [x] 1.2 Remove `fetchAllTransactions()` calls from `+layout.svelte`, `accounts/+page.svelte`, `planning/+page.svelte`, `CategoryStudio.svelte`, and `reedrichStore.invalidateAndRefresh()`.
- [x] 1.3 Migrate `fetchTransactionsForDrawer` in `apps/web/src/lib/stores/reedrich.svelte.ts` to always send `envelope=true` and parse the single `TransactionEnvelope` contract.
- [x] 1.4 Refactor `apps/web/src/lib/components/category/CategoryStudio.svelte` to query date-scoped transactions via `reedrichStore.fetchTransactions()` instead of relying on full-history memory caches.

## 2. Cockpit Feed Deduplication

- [x] 2.1 Rewrite `loadRecent()` in `apps/web/src/lib/components/cockpit/CockpitRecentLedger.svelte` to call `reedrichStore.fetchTransactions({ startDate, endDate, limit: 30, envelope: true }, signal)` and assign `envelope.items`, deleting the raw `fetch()` path.
- [x] 2.2 Add a component-scoped `AbortController` in-flight replacement guard in `CockpitRecentLedger.svelte` so re-triggered loads abort the prior request, with effect cleanup aborting on unmount.

## 3. Testing & Validation

- [x] 3.1 Add unit coverage in `apps/web/src/lib/stores/reedrich.test.ts` verifying drawer queries include `envelope=true`, `fetchAllTransactions` is a no-op, and mutation refresh does not loop.
- [x] 3.2 Run unit test suite: `bun run --cwd apps/web test:unit`.
- [x] 3.3 Run typecheck and lint: `bun run check:web` and `bun run lint:web`.
- [x] 3.4 Create and run Playwright E2E test `apps/web/tests/no-duplicate-transaction-fetch.spec.ts` replaying the Jam route sequence on login and navigation, asserting zero `limit=200` loops and zero duplicate `limit=30` hits.
