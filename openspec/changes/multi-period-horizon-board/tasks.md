# Tasks

## Phase 1: Shared Types & Backend Infrastructure

- [x] **Add `UserSettings` type to `packages/shared`**
  Add `UserSettings` interface to `packages/shared/src/account-detail.ts` with fields: `ledgerViewMode: 'single' | 'calendar_board'`, `activePeriods: string[]`, and optional future fields (`dateStartOfMonth?`, `language?`, `mainCurrency?`). Verify re-export from `packages/shared/src/index.ts`.
  _Acceptance: `bun run check` passes in `packages/shared`; type is importable from `@maniyy/shared`._

- [x] **Create D1 migration `0002_user_settings.sql`**
  Add `apps/agent/db/migrations/0002_user_settings.sql` with `CREATE TABLE IF NOT EXISTS user_settings (user_id TEXT PRIMARY KEY, settings_json TEXT NOT NULL, updated_at INTEGER NOT NULL)`.
  _Acceptance: `bunx wrangler d1 migrations apply maniyy-agent-db --local` succeeds._

- [x] **Implement settings DB query functions**
  Add `getUserSettings(db, userId)` and `upsertUserSettings(db, userId, settingsJson)` to `apps/agent/src/db/queries.ts`. `getUserSettings` returns parsed `UserSettings` or default `{ ledgerViewMode: "single", activePeriods: [] }` if no row exists. `upsertUserSettings` uses `INSERT ... ON CONFLICT(user_id) DO UPDATE`.
  _Acceptance: Unit test `apps/agent/src/__tests__/unit/settings.test.ts` covers get-default, get-existing, upsert-new, upsert-merge, invalid-json-rejection._

- [x] **Create settings Hono router and register in app**
  Create `apps/agent/src/routes/settings.ts` with `GET /` (returns settings) and `PUT /` (validates body, merges with existing, upserts). Apply `authMiddleware`. Register `app.route('/api/settings', settingsRouter)` in `apps/agent/src/index.ts`.
  _Acceptance: `bun run --cwd apps/agent test` passes; `bun run check` passes._

- [x] **Deploy agent with settings migration**
  Run `bunx wrangler d1 migrations apply maniyy-agent-db` (remote) and `cd apps/agent && bun run build && bunx wrangler deploy`. Verify `curl -s https://maniyy.lutfidmz.workers.dev/api/settings` returns 401 (unauthenticated) and authenticated request returns default settings JSON.
  _Acceptance: Live endpoint responds correctly._

## Phase 2: Frontend Settings Store & View Mode Switcher

- [x] **Create `settingsStore` in `apps/web/src/lib/stores/settings.svelte.ts`**
  Implement `SettingsStore` class with `$state<UserSettings>` settings, `isLoaded` flag, `load(agentBaseUrl, token)` method, and debounced `save(partial)` method (500ms). Export singleton `settingsStore`.
  _Acceptance: Unit test `apps/web/src/lib/stores/settings.test.ts` covers load-from-api, load-default-on-404, save-debounce, save-merge._

- [x] **Integrate `settingsStore.load()` into auth flow**
  In `apps/web/src/routes/+layout.svelte` (or wherever `reedrichStore` initializes after auth), add `settingsStore.load(PUBLIC_AGENT_URL, token)` call so settings are available before `/ledger` renders.
  _Acceptance: After login, `settingsStore.isLoaded === true` and `settingsStore.settings` contains server values._

- [x] **Add `ViewModeSwitcher` component and wire into Ledger header**
  Create `apps/web/src/lib/components/ledger/ViewModeSwitcher.svelte` — a segmented control with "List" and "Board" options. Reads/writes `settingsStore.settings.ledgerViewMode`. Hidden when viewport < 1024px (media query check). Update `/ledger/+page.svelte` header section to include `ViewModeSwitcher` and conditionally render existing table vs new board based on `settingsStore.settings.ledgerViewMode`.
  _Acceptance: Clicking "Board" sets `ledgerViewMode` to `calendar_board`, persists via `settingsStore.save()`, and survives page refresh._

## Phase 3: Horizon Board Core Components

- [x] **Create `HorizonBoard.svelte` parent component**
  Create `apps/web/src/lib/components/ledger/HorizonBoard.svelte`. Renders a CSS Grid container (`repeat(auto-fill, minmax(340px, 1fr))`, gap 16px). Iterates `orderedPeriods` derived from `settingsStore.settings.activePeriods` (sorted chronologically). Computes `PeriodSummary[]` array using cascading Net Worth logic (period 0 via `calculatePointInTimeNetWorth`, period N = prior closing + current net). Passes summary + transactions to each child.
  _Acceptance: Component renders 3 default period slots when `activePeriods` is empty (auto-initializes current + next 2 months). `bun run check` passes._

- [x] **Create `HorizonPeriodColumn.svelte` component**
  Create `apps/web/src/lib/components/ledger/HorizonPeriodColumn.svelte`. Props: `periodStart`, `periodEnd`, `periodSummary`, `globalFilters`. Contains: PeriodHeader (month/year label, "+ Transaksi" button, remove button), dense ledger table (2-line rows), and PeriodSummaryCard. Transaction rows are `$derived` from `reedrichStore.allTransactions` filtered by period date range and global filters. Click row → `transactionFormStore.openView(tx)`. "+ Transaksi" → `transactionFormStore.openCreate()` with date prefilled.
  _Acceptance: Column renders transactions within date range, clicking row opens drawer, quick-add prefills correct month._

- [x] **Create `PeriodSummaryCard.svelte` component**
  Create `apps/web/src/lib/components/ledger/PeriodSummaryCard.svelte`. Props: `PeriodSummary`. Renders 3 sections: (1) Cashflow strip: Masuk (green), Keluar, Net (mono font, IDR). (2) Point-in-time Net Worth with Spendable vs Locked breakdown. (3) Goal snapshots with name, projected amount / target, and percentage progress pill. Follows minimalist-ui tokens: 1px borders, warm bone canvas, spot pastels.
  _Acceptance: All summary metrics match expected values from test data. `bun run check` passes._

- [x] **Create `AddPeriodCard.svelte` action card**
  Create `apps/web/src/lib/components/ledger/AddPeriodCard.svelte`. Renders a dashed-border card at the end of the grid. On click, opens a Popover with month/year selector. On confirm, appends `"YYYY-MM"` to `settingsStore.settings.activePeriods` and calls `settingsStore.save()`.
  _Acceptance: Adding a period persists to backend, new column appears in grid without refresh._

## Phase 4: Financial Cascade Engine & Goal Projections

- [x] **Implement cascading Net Worth computation in `HorizonBoard`**
  Wire the `$derived.by` computation that: (1) computes period 0 Net Worth via `calculatePointInTimeNetWorth` anchored to period 0's end date; (2) for each subsequent period, accumulates net cashflow onto prior closing Net Worth; (3) splits Spendable/Locked based on wallet flow analysis. Verify reactivity: mutating a transaction in any period triggers recalculation of all downstream periods.
  _Acceptance: Test scenario — add Rp 5.000.000 expense in Oct, verify Nov and Dec closing Net Worth decrease by that amount. `bun run --cwd apps/web test` passes._

- [x] **Implement goal projection across periods**
  In `HorizonBoard`, compute `GoalProjection[]` per period: for each `GoalSnapshot`, accumulate planned transfer contributions targeting goal-linked wallets across periods. Mark the first period where projected amount >= targetAmount as milestone.
  _Acceptance: Given a Rp 20.000.000 goal with Rp 2.000.000/month planned transfers, milestone renders at the correct period. Unit test covers accumulation and boundary crossing._

## Phase 5: Testing & Validation

- [x] **Write Vitest unit tests for cascading Net Worth and period filtering**
  Extend `apps/web/src/lib/utils/networth-timeline.test.ts` with multi-period cascade scenarios. Create `apps/web/src/lib/components/ledger/horizon-board.test.ts` for period date slicing and global filter intersection.
  _Acceptance: `bun run --cwd apps/web test` — all new tests pass, existing tests unbroken._

- [x] **Write Vitest unit tests for settings store and backend handler**
  Create `apps/web/src/lib/stores/settings.test.ts` (load, save, debounce, merge). Extend `apps/agent/src/__tests__/unit/settings.test.ts` (GET default, PUT upsert, validation, auth).
  _Acceptance: `bun run --cwd apps/agent test` and `bun run --cwd apps/web test` pass._

- [x] **Run full validation suite**
  Execute `bun run --cwd apps/web check` (svelte-check), `bun run --cwd apps/web test` (Vitest), `bun run --cwd apps/agent test` (Vitest). Verify zero type errors, zero test failures.
  _Acceptance: All commands exit 0._

- [x] **Visual verification in browser**
  Open `https://maniyy2.pages.dev` (or local dev), login, navigate to `/ledger`. Switch to Board view. Verify: 3 period columns render, transactions display per period, summary cards show correct metrics, adding a transaction in one period cascades to subsequent summaries. Resize viewport to verify wrapping behavior. Refresh to verify settings persistence.
  _Acceptance: All scenarios visually confirmed._
