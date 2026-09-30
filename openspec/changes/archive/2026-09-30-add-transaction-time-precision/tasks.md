# Tasks

## 1. Store Time State + ISO Helper

- [x] 1.1 Add `time` field (`HH:mm`, default current local time via `getCurrentTimeString()`), reset it in `openCreate()`/`resetFields()`, parse `HH:mm` via string surgery in `populateFromTransaction()` (`00:00` for date-only), and extend `isValid` with `/^([01]\d|2[0-3]):[0-5]\d$/` check in `apps/web/src/lib/stores/transaction-form.svelte.ts`; verify `bun test apps/web/src/lib/stores/transaction-form.test.ts` passes with new cases (pre-fill format, ISO parse, date-only default, invalid-time blocks valid)
- [x] 1.2 Add pure `buildLocalISO(date, time)` helper (seconds `:00`, offset from `getTimezoneOffset()`) plus `hasNonMidnightTime()` predicate, with unit tests covering output shape `/^DTHH:mm:00[+-]\d{2}:\d{2}$/` and midnight/date-only cases; verify new test file passes via `bun test`

## 2. Form Drawer Time Input + Submit Wiring

- [x] 2.1 Add native `input[type=time][step=60]` bound to `transactionFormStore.time` beside `SingleDatePicker` in the Tanggal block of `TransactionFormDrawer.svelte` (2-col grid on `sm+`, stacked on mobile, Clock Phosphor icon, `#EAEAEA` styling, error state mirroring date), shown in both create and edit modes; verify with `bun run check` and visual check in browser at desktop + mobile widths
- [x] 2.2 Route all three submit paths (create expense/income, create transfer, edit delta) plus the optimistic post-edit `transactionDate` patch through `buildLocalISO(date, time)` in `handleSubmit`; verify via Playwright drawer journey (create with explicit time → detail shows `· HH:mm`; edit preserves time) with `bunx playwright test`

## 3. Detail View Time Display

- [x] 3.1 Switch the Tanggal row in `TransactionDetailView.svelte` to conditional time display (date + muted `· HH:mm` when `hasNonMidnightTime()`, date-only otherwise, no new rows); verify via Playwright detail assertions (timed transaction shows time, legacy midnight fixture shows date only) and `bun run check`

## 4. Integration Validation

- [x] 4.1 Run full `bun test`, `bun run check`, and the transaction Playwright suite; confirm ledger list, horizon board, and cockpit still render date-only with correct same-day ordering, then report results for review
