## 1. Horizon Board Present-Month Labeling & Localization

- [x] 1.1 In `apps/web/src/lib/components/ledger/HorizonBoard.svelte`, update period label resolution so that when `periodKey === currYearMonth`, the label is assigned to `'PROYEKSI AKHIR BULAN'` (closing month-end projection) instead of `'NET WORTH SAAT INI'`.
  - **Acceptance Criteria**: When viewing the current calendar month on the Horizon Board, the net worth section displays the label indicating month-end projection.
  - **Verification**: `bun run check:web`

- [x] 1.2 In `apps/web/src/lib/i18n/locales/{en,id}.ts`, add translation keys for `closingMonthEndProjection` and update `PeriodSummaryCard.svelte` to render the localized label.
  - **Acceptance Criteria**: English displays `"Month-End Projection"` and Indonesian displays `"Proyeksi Akhir Bulan"`.
  - **Verification**: `bun run test:web`

- [x] 1.3 Add or update unit tests in `apps/web/tests/multi-horizon-board.spec.ts` or component tests verifying current month period column labeling.
  - **Acceptance Criteria**: Horizon Board tests pass asserting the disambiguated label.
  - **Verification**: `bun run test:web`

## 2. List View Full-Period Cashflow Aggregation Integrity

- [x] 2.1 In `apps/web/src/routes/ledger/+page.svelte`, update `horizonAnchorData` fetching to also query the current calendar month (`endYearMonth === currYearMonth`), enabling server-anchored cashflow projections for the current month.
  - **Acceptance Criteria**: `horizonAnchorData` is populated for current month date presets (`this_month`).
  - **Verification**: `bun run check:web`

- [x] 2.2 In `apps/web/src/routes/ledger/+page.svelte`, update `aggregateStats` to derive `income`, `expense`, and `net` from authoritative server horizon cashflow when no narrowing sub-filters are active, eliminating page-1 (50 item) truncation.
  - **Acceptance Criteria**: List view cashflow totals match complete month server totals within IDR precision.
  - **Verification**: `bun run check:web`

- [x] 2.3 In `apps/web/src/routes/ledger/+page.svelte`, update the right-zone anchor subtext when viewing the present month to clarify `"posisi kas riil hari ini (live snapshot)"`.
  - **Acceptance Criteria**: Subtext clearly distinguishes live realized wealth today from projected month-end closing positions.
  - **Verification**: `bun run check:web`

## 3. Verification & Git Hygiene

- [x] 3.1 Run web unit test suites to confirm zero regressions.
  - **Acceptance Criteria**: All unit test suites pass with 0 failures.
  - **Verification**: `bun run test:web`

- [x] 3.2 Run SvelteKit full workspace type check.
  - **Acceptance Criteria**: Full workspace TypeScript and Svelte 5 runes check passes with 0 errors.
  - **Verification**: `bun run check:web`

- [x] 3.3 Run pre-commit secret hygiene check.
  - **Acceptance Criteria**: Secret scan passes with 0 findings.
  - **Verification**: `bun scripts/check-secrets.ts`
