# Tasks

## 1. Universal Period Utilities and Query Serialization

- [x] 1.1 Add `getPeriodDateBounds(periodKey)` in `apps/web/src/lib/utils/dates.ts` to cleanly parse both `YYYY-MM` months and `YYYY-MM-DD_YYYY-MM-DD` intervals.
- [x] 1.2 Add `formatPeriodTitle(periodKey, locale)` in `apps/web/src/lib/utils/dates.ts` to render localized date ranges (e.g., `"25 Sep – 24 Okt 2026"`) for custom intervals and month titles for calendar months.
- [x] 1.3 Update `fetchHorizonProjections(periods)` in `apps/web/src/lib/stores/reedrich.svelte.ts` to serialize 2D JSON array query parameter `periods=[["startDate","endDate"],...]` when custom interval keys are present.
- [x] 1.4 Add unit tests in `apps/web/src/lib/utils/dates.test.ts` and `apps/web/src/lib/stores/reedrich.test.ts` verifying interval parsing and 2D query formatting.

## 2. Horizon Column Infinite Scroll and Immutable Cashflow

- [x] 2.1 Refactor `apps/web/src/lib/components/ledger/HorizonPeriodColumn.svelte` to implement an `IntersectionObserver` sentinel inside the scroll container, automatically loading the next page of transactions without a manual click button.
- [x] 2.2 Decouple `PeriodSummaryCard` cashflow by passing `periodSummary` directly, removing the truncated `localCashflow` override so cashflow numbers remain invariant during scrolling.
- [x] 2.3 Add scroll progress indicator in the column header (e.g. `"50 dari 84 transaksi"`) when not all transactions have been loaded into view.
- [x] 2.4 Update `handleMaximize` in `HorizonPeriodColumn.svelte` to derive `startDate` and `endDate` via `getPeriodDateBounds()`, correctly preserving custom date interval bounds when maximizing to List view.

## 3. AddPeriodCard Custom Date Range Selection

- [x] 3.1 Update `apps/web/src/lib/components/ledger/AddPeriodCard.svelte` with a tabbed interface allowing users to switch between "Bulan Kalender" and "Rentang Tanggal Kustom".
- [x] 3.2 Implement start and end date inputs with validation (`startDate <= endDate`) in `AddPeriodCard.svelte`, saving new periods formatted as `${startDate}_${endDate}`.
- [x] 3.3 Update period sorting in `settingsStore.settings.activePeriods` and `orderedPeriods` to sort chronologically by `startDate` using `getPeriodDateBounds()`.

## 4. Verification and Validation

- [x] 4.1 Run `bun run check` (svelte-check) to verify 0 errors and 0 warnings across all TypeScript and Svelte components.
- [x] 4.2 Run unit tests (`bun run test:unit`) to confirm all parser, store, and component tests pass.
- [x] 4.3 Add Playwright E2E tests in `apps/web/tests/multi-horizon-board.spec.ts` verifying automatic infinite scroll and custom date interval column rendering.
- [x] 4.4 Run full E2E test suite (`bunx playwright test tests/multi-horizon-board.spec.ts tests/ledger-dual-layer.spec.ts`) to ensure end-to-end user journeys pass.
