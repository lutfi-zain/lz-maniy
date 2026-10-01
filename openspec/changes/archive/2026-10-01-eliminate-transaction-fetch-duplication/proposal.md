# Proposal: Eliminate Transaction Fetch Duplication and Unbounded Loops

## Why

Two Jam session recordings on `maniyy.membran.app` reveal critical network request amplification:
1. **Jam #1 (`a7ae0eb0`, 16s)**: Duplicate `GET /api/v1/transactions?limit=30&startDate&endDate` requests firing in pairs 1–2ms apart on every Cockpit and Accounts page mount due to un-guarded `$effect` and `DateRangePicker` re-triggers in `CockpitRecentLedger.svelte`.
2. **Jam #2 (`a005a08b`, 54s)**: **261 network requests** fired in 54 seconds upon user login. Over 15 chained `limit=200&offset=...` queries (offset 0, 200, 400, 600, 800, 1000, 1200, 1400+) downloading megabytes of raw history via the legacy `while (true)` loop in `reedrichStore.fetchAllTransactions()`.

This unbounded pagination loop is triggered on layout mount (`+layout.svelte:31`), page mounts (`/accounts`, `/planning`, `CategoryStudio`), and on every single transaction mutation (`invalidateAndRefresh()`). Terminating this loop, adopting localized date-range querying, and guarding the cockpit feed with abort-and-replace completely eliminates this network flooding.

## What Changes

- **Deprecate and Kill Unbounded `fetchAllTransactions()`**:
  - Replace the `while (true)` pagination loop in `reedrichStore.fetchAllTransactions()` with a deprecated no-op shim that logs a dev warning.
  - Remove calls to `fetchAllTransactions()` from `+layout.svelte`, `accounts/+page.svelte`, `planning/+page.svelte`, `CategoryStudio.svelte`, and `invalidateAndRefresh()`.
- **Eliminate Cockpit Duplicate Fetching (`CockpitRecentLedger.svelte`)**:
  - Migrate `loadRecent()` from raw `fetch()` to `reedrichStore.fetchTransactions({ startDate, endDate, limit: 30, envelope: true }, signal)`.
  - Add a component-scoped `AbortController` in-flight replacement guard and cleanup on unmount, eliminating the 1–2ms double-fire.
- **Date-Scoped Querying in `CategoryStudio.svelte`**:
  - Refactor `CategoryStudio.svelte` to query transactions scoped to the active timeframe (`startDate` to `endDate`, `limit: 200`) instead of relying on full-history memory caches.
- **Envelope Normalization in `fetchTransactionsForDrawer`**:
  - Normalize `fetchTransactionsForDrawer` to always request `envelope=true` and parse the unified `TransactionEnvelope` contract.

## Capabilities

### New Capabilities
None. All changes harden existing query pipelines and cockpit presentation.

### Modified Capabilities
- `financial-store`: REQUIREMENTS change — all transaction reads MUST flow through the parameterized envelope pipeline with concurrency-pool gating and abort support; the unconstrained full-history loop is terminated.
- `account-dashboard`: REQUIREMENTS change — the cockpit recent-transactions feed MUST issue exactly one network request per distinct filter state and abort stale in-flight requests.

## Impact

- **Codebase**:
  - `apps/web/src/lib/components/cockpit/CockpitRecentLedger.svelte` (migrate to store pipeline + in-flight guard)
  - `apps/web/src/lib/stores/reedrich.svelte.ts` (terminate while loop, envelope normalization in `fetchTransactionsForDrawer`, remove from `invalidateAndRefresh`)
  - `apps/web/src/routes/+layout.svelte`, `apps/web/src/routes/accounts/+page.svelte`, `apps/web/src/routes/planning/+page.svelte` (remove legacy calls)
  - `apps/web/src/lib/components/category/CategoryStudio.svelte` (date-scoped query)
- **Breaking Changes**: None. Backwards compatible API contracts with drastic reduction in network traffic.
