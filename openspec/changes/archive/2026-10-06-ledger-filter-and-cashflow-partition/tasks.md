## 1. Domain Types & Shared Contracts

- [x] 1.1 Update `HorizonPeriodSummary` in `packages/shared/src/account-detail.ts` to add optional `netSpendable?: number` and `netLocked?: number` to the `cashflow` object.
- [x] 1.2 Verify shared package builds and type-checks cleanly via `bun run check:web`.

## 2. Inbound Search Filter on Ledger Studio

- [x] 2.1 Update `apps/web/src/routes/ledger/+page.svelte` in `onMount` to read `page.url.searchParams.get('search')` and assign it to `searchKeyword`.
- [x] 2.2 Verify navigating to `/ledger?search=test` populates `searchKeyword`, triggers the transaction query effect with `q: 'test'`, and fills the search input.

## 3. Horizon Board Cashflow Liquidity Decomposition & Labeling

- [x] 3.1 Update `PeriodSummary` interface and `PeriodSummaryCard.svelte` in `apps/web/src/lib/components/ledger/PeriodSummaryCard.svelte`:
  - Add optional `netSpendable?: number` and `netLocked?: number` to `PeriodSummary`.
  - Add a sub-breakdown row below the Outflow row displaying "Net Operasional" (`netSpendable` with `#346538` green dot) and "Net Cadangan" (`netLocked` with `#956400` amber dot) when present.
  - Ensure the decomposition row is cleanly omitted when `netSpendable` or `netLocked` is undefined.
  - Clarify the Net Worth section header to display the temporal label from `summary.label` ("PROYEKSI AKHIR BULAN", "PROYEKSI NET WORTH", "NET WORTH PENUTUPAN").
- [x] 3.2 Update `HorizonBoard.svelte` in `apps/web/src/lib/components/ledger/HorizonBoard.svelte` to extract `srvPeriod?.cashflow.netSpendable` and `srvPeriod?.cashflow.netLocked` and pass them into each `PeriodSummary` object.

## 4. Test Suites & Verification

- [x] 4.1 Add unit tests in `apps/web/src/lib/components/ledger/PeriodSummaryCard.test.ts` verifying:
  - Cashflow decomposition rows render when `netSpendable` and `netLocked` are present with correct dot indicators and formatted values.
  - Decomposition rows are omitted when those properties are undefined.
  - Net Worth label respects the passed temporal label.
- [x] 4.2 Run `bun run test:web` to ensure all unit tests pass without regressions.
- [x] 4.3 Run `bun run check:web` to confirm zero TypeScript or Svelte 5 compilation errors across the workspace.
- [x] 4.4 Run `bun scripts/check-secrets.ts` to ensure no credentials or secrets were introduced.
