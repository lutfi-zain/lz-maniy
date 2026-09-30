# Design

## Context

See `proposal.md` — Why for motivation. Current state (observed, not assumed):

- `apps/web/src/lib/stores/transaction-form.svelte.ts`: single `date: string` (`YYYY-MM-DD`), init via `getTodayString()`, populate via `t.transactionDate.slice(0, 10)` — time discarded on read.
- `apps/web/src/lib/components/transaction/TransactionFormDrawer.svelte` (`handleSubmit`, lines ~123-201): sends `transactionFormStore.date` verbatim as `date` in `CreateTransactionPayload` / `CreateTransferPayload` / `UpdateTransactionPayload`. All three payload types accept `date: string` plus optional `transactionDate` alias.
- `apps/web/src/lib/components/ui/SingleDatePicker.svelte`: emits `YYYY-MM-DD` only; trigger shows `dFmt(value)`.
- `apps/web/src/lib/utils/dates.ts`: `dFmt()` (date-only, used everywhere for `transactionDate`) and `dFmtTime()` (date+time, already used for `transactionRealizedAt` / `transactionCreatedAt` but never for `transactionDate`).
- `apps/web/src/lib/components/transaction/TransactionDetailView.svelte` line ~121: Tanggal row uses `dFmt(transaction.transactionDate)`.
- List surfaces (`routes/ledger/+page.svelte`, `HorizonBoard.svelte`, `HorizonPeriodColumn.svelte`, `CockpitRecentLedger.svelte`, `DrawerTransactionTable.svelte`) all use `dFmt()`; filters compare via `.slice(0, 10)` — unaffected by longer ISO strings.
- Reedrich OpenAPI: `date` / `transactionDate` are `format: date-time` ISO timestamps on POST transactions, POST transfers, PATCH transaction. Backend already parses full datetimes; date-only strings are presumably coerced to midnight.
- `packages/shared/src/account-detail.ts`: payload types — no change needed (`date: string` already).

Constraint: Svelte 5 runes (`$state`, `$derived`), minimalist-ui tokens (`#EAEAEA` borders, `#F9F9F8` surfaces, mono for time values, Phosphor Bold icons), `bun` runner, Vitest + svelte-check validation.

## Goals / Non-Goals

**Goals:**

- Time input visible and editable in create mode, pre-filled with current local time.
- Time input in edit mode, pre-filled from the stored transaction datetime.
- Detail view shows time with midnight-hide rule for legacy data.
- All outgoing `date` fields become full local-offset ISO datetimes; seconds fixed `:00`.
- Same-day ordering correct via full datetime while list surfaces stay date-only.

**Non-Goals (design-level):**

- No new date/time picker component — reuse `SingleDatePicker` + native `<input type="time">`.
- No timezone selection or UTC conversion on write — local offset only.
- No seconds-level input or validation.
- No changes to `SingleDatePicker` internals, `dFmt`/`dFmtTime`, or shared payload types.
- No migration of legacy midnight data — midnight-hide rule handles it at render.

## Decisions

### 1. Store: add `time` field alongside `date`

`TransactionFormStore` gains `time = $state<string>(getCurrentTimeString())` where the helper returns local `HH:mm` (zero-padded hours/minutes). `openCreate()` resets both `date` (today) and `time` (now). `resetFields()` same. `populateFromTransaction()` parses:

- ISO with time (`2026-09-25T12:00:00+07:00` or `...Z`): `date = slice(0,10)`, `time = HH:mm` extracted from the string's time portion (positions 11-16) — string surgery, not `new Date()`, to avoid shifting the wall-clock time across timezone reinterpretation.
- Date-only (`2026-09-25`): `date` as-is, `time = '00:00'`.

`isValid` derived gains: `time` non-empty and matching `/^([01]\d|2[0-3]):[0-5]\d$/`. Rationale: string surgery preserves exactly what the backend stored; `new Date(...).getHours()` would re-render it in the browser zone and could shift the displayed hour for `Z`-suffixed values.

Alternative considered: single `datetime` string field — rejected, breaks `SingleDatePicker` binding which expects `YYYY-MM-DD`.

### 2. ISO assembly: `buildLocalISO(date, time)` helper

New pure helper (in store module or `lib/utils/dates.ts`):

```
buildLocalISO('2026-09-30', '14:30') → '2026-09-30T14:30:00+07:00'
```

Offset derived from `new Date().getTimezoneOffset()` at submit time (sign inverted, zero-padded `±HH:MM`). Seconds hardcoded `:00`. Used in `handleSubmit` for all three paths (create expense/income, create transfer, edit delta) and for the optimistic `transactionDate` patch after edit. Rationale: local offset matches what the user saw in the inputs; backend stores absolute instant, filters compare calendar-date slices which are stable for WIB users. Alternative (send `Z` UTC) rejected — would shift calendar date for evening transactions in +07:00.

### 3. Form layout: date + time side-by-side, responsive stack

In `TransactionFormDrawer.svelte`, the "Tanggal Transaksi" block becomes a 2-column grid on `sm+` (date picker flex-1, time input fixed ~120px) and stacked on mobile. Time control:

- Native `<input type="time" step="60">` bound to `transactionFormStore.time`, styled to match the picker trigger: `rounded-md border #EAEAEA bg-white px-3 py-2 font-mono text-xs`, Clock Phosphor Bold icon prefix, `hasError` → `border-[#9F2F2D]`.
- Label `Jam` with required marker (pre-filled, so effectively always valid unless cleared).
- Inline error mirrors the date error pattern (`text-[11px] text-[#9F2F2D]`).

Native input chosen over custom dropdown grid: free keyboard entry, free mobile wheel picker, zero new components, a11y built in. `step="60"` hides the seconds field in supporting browsers. One instance shared by create and edit (same form markup, both modes) — create pre-fill comes from `openCreate`, edit from `populateFromTransaction`.

### 4. Detail view: enrich Tanggal row, midnight-hide

`TransactionDetailView.svelte` Tanggal row switches `dFmt` → conditional: if time portion is `00:00` or absent, render `dFmt()` as today; else render date + muted time span (`30 Sep 2026 · 14:30`, time in `text-[11px] text-[#787774]`). Midnight check via string inspection (`slice(11,16) === '00:00'` or length ≤ 10), not `Date` parsing, to avoid zone-shift false positives on `Z`-suffixed midnights. This reuses the existing metadata key-value row — no new rows, no layout change.

### 5. List / horizon / cockpit: deliberately untouched

No template changes. Ordering correctness comes free: wherever lists sort by `transactionDate` string comparison, full ISO strings sort chronologically including intra-day. Filters using `.slice(0,10)` keep working. This is verified, not assumed, by the unit tests below (string-sort check on same-day fixtures).

### 6. Data contract mapping

| UI field | Payload field | Wire format | Endpoint |
|---|---|---|---|
| `date` + `time` | `date` | `YYYY-MM-DDTHH:mm:00±HH:MM` | POST `/api/v1/transactions`, POST `/api/v1/transfers`, PATCH `/api/v1/transactions/{id}` |
| — | `transactionDate` (alias) | not sent (backend treats as alias; `date` suffices) | — |
| `transactionDate` (read) | — | full ISO from backend, or legacy date-only | GET transaction / list / snapshot |

No change to `packages/shared` types (`date: string` covers both shapes).

### Component hierarchy (changed nodes only)

```
TransactionFormDrawer (create | edit)
├── SingleDatePicker (bind: transactionFormStore.date)   [unchanged]
├── input[type=time] (bind: transactionFormStore.time)   [ADDED]
└── handleSubmit → buildLocalISO(date, time) → reedrichStore.create/update  [MODIFIED]

TransactionDetailView (view)
└── Tanggal row: dFmt → conditional dFmt/dFmtTime-midnight-hide  [MODIFIED]

TransactionFormStore
├── time: string ($state) + getCurrentTimeString()  [ADDED]
├── populateFromTransaction: parse HH:mm  [MODIFIED]
└── isValid: time format check  [MODIFIED]
```

Responsive: drawer is already `max-w-[620px]` full-height slide-over, 100vw on mobile — the date+time grid stacks below `sm` breakpoint, consistent with the existing Amount/AdminFee grid pattern in the same form.

### Test strategy

Vitest unit (`apps/web/src/lib/stores/transaction-form.test.ts`, extend; new `lib/utils/dates` test for `buildLocalISO` + midnight-hide predicate if placed there):

1. `openCreate` pre-fills `time` matching `/^([01]\d|2[0-3]):[0-5]\d$/` (run against real clock, format-only assertion).
2. `populateFromTransaction` with `2026-09-25T14:30:00+07:00` → `date '2026-09-25'`, `time '14:30'`; with `2026-09-25` → `time '00:00'`.
3. `buildLocalISO('2026-09-30','14:30')` → matches `/^2026-09-30T14:30:00[+-]\d{2}:\d{2}$/`.
4. `isValid` false when `time` empty or `'25:99'`; true with valid time + otherwise-valid form.
5. Same-day string sort: `['...T14:30...','...T09:15...'].sort()` puts 09:15 first (guards the ordering claim).
6. Midnight-hide predicate: true for `00:00`/`date-only`, false for `14:30`.

Playwright e2e (transaction drawer journey): open create via `N`, assert time input visible with pre-filled value, set explicit time, submit, assert detail shows `· HH:mm`; edit flow asserts time preserved; legacy fixture (date-only) asserts no time shown. Scoped to existing drawer spec file conventions.

Validation commands: `bun test` (Vitest), `bun run check` (svelte-check). Per project apply guidance, Playwright (`bunx playwright test`) for the drawer journey before archive.

## Risks / Trade-offs

- **Offset vs calendar-date mismatch for travelers**: a user in another zone submitting an old WIB transaction stamps the travel zone's offset; `.slice(0,10)` filters could bucket it a day off at midnight edges. Accepted: target user is single-zone (WIB); no tz picker by design (non-goal). Mitigation: wall-clock date portion is preserved verbatim, so only ±1-day edge cases near midnight are affected.
- **`Z`-suffixed backend values on read**: string-surgery parsing keeps wall-clock digits as stored, which may differ from the user's local rendering of that instant. Accepted: consistency with what detail view already shows via `dFmtTime(new Date(...))` is approximate anyway; edit round-trips preserve digits, no silent shift introduced by us.
- **Native `type=time` styling variance** across browsers (notably the built-in clock icon and dark-mode rendering). Accepted: layout/typography normalized via classes; picker chrome variance is a native affordance users recognize. `step="60"` degrades gracefully where unsupported (seconds field may appear — still valid `HH:mm:ss`, backend accepts).
- **Pre-filled time on create is implicit data**: user who ignores the field submits "now", which is the documented behavior (spec: pre-filled with current local time). No silent-default risk beyond what the spec states.
- **No payload-type change** means no compile-time guard that `date` is full ISO. Mitigation: unit test on `buildLocalISO` output shape + e2e asserting detail shows time after create.
