# Design

## Context

See proposal.md — Why. The existing `/ledger` route renders a single-period tabular view with filters, aggregates, and point-in-time Net Worth. The `calculatePointInTimeNetWorth` and `calculatePointInTimeWalletBalances` utilities in `$lib/utils/networth-timeline.ts` already compute forward/backward projections anchored to any date. The agent backend uses Hono on Cloudflare Workers with D1 (SQLite) and existing `authMiddleware` for token validation.

## Goals / Non-Goals

**Goals:**
- Reuse existing ledger filtering, aggregation, and Net Worth projection logic for each period column.
- Keep the horizon board as a view mode within `/ledger`, not a separate route.
- Store user preferences server-side for cross-device persistence.

**Non-Goals:**
- No custom component library additions — compose from existing shadcn-svelte primitives and Maniyy UI tokens.
- No WebSocket or real-time sync — settings save via debounced PUT.

## Decisions

### D1: View Mode Architecture — Same Route, Conditional Render

The horizon board is rendered inside `/ledger` by switching on a `viewMode` state. When `viewMode === 'calendar_board'`, the existing filter bar stays, but the single table + summary strip are replaced by the period grid board. This avoids route duplication and lets global filters apply to both views.

### D2: Period Column Grid — CSS Grid with `auto-fill`

```css
/* Board container */
display: grid;
grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
gap: 16px;
```

At 1400px max-width content area:
- 3 periods: 3 columns (~440px each)
- 4 periods: 4 columns (~330px each, tight but readable)
- 5+ periods: wrap to next row

On 1024px–1279px: `minmax(340px, 1fr)` naturally yields 2 columns. Below 1024px: board hidden entirely, view switcher not rendered.

### D3: Per-Period Data Slicing — Derived State from Global Store

Each `HorizonPeriodColumn` component receives a `periodStart` and `periodEnd` prop. Inside, it derives its transaction subset from the global `reedrichStore.allTransactions` using `$derived`, applying the same date-range + global-filter logic as the current ledger page. No separate data fetching per period.

### D4: Cascading Net Worth — Serial Accumulation in Parent

The board parent component computes an ordered array of `PeriodSummary` objects:

```ts
interface PeriodSummary {
  periodKey: string;       // "2026-10"
  startDate: string;
  endDate: string;
  income: number;
  expense: number;
  net: number;
  closingNetWorth: number;
  spendable: number;
  locked: number;
  goalSnapshots: GoalProjection[];
}
```

Period 0 uses `calculatePointInTimeNetWorth(endDate: period0.endDate)`. For period N > 0, closing Net Worth = `periodSummaries[N-1].closingNetWorth + periodN.net`. This is a `$derived.by` that recomputes on any transaction mutation.

### D5: Goal Projection Across Periods

For each goal, the board iterates periods and accumulates projected contributions:
- Period 0: goal's `currentAmount` from `reedrichStore.activeGoals` + any planned savings in period 0.
- Period N: prior period's projected goal amount + planned savings in period N.
- The board tracks which period first crosses `targetAmount` and renders a milestone indicator.

Goal contribution detection: filter planned transactions where `transactionType === 'transfer'` and `transactionTargetWalletId` matches a goal's linked wallet ID. This reuses existing `GoalSnapshot.linkedWalletsBreakdown` for wallet-to-goal mapping.

### D6: User Settings Backend — D1 Table + Hono Router

**Migration `0002_user_settings.sql`:**
```sql
CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  settings_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
```

**Route: `apps/agent/src/routes/settings.ts`**
- `GET /api/settings` — `authMiddleware` → query `user_settings` by `userId` → return parsed JSON or default `{ ledgerViewMode: "single", activePeriods: [] }`.
- `PUT /api/settings` — `authMiddleware` → validate body → merge with existing → `INSERT ... ON CONFLICT(user_id) DO UPDATE SET settings_json = ?, updated_at = ?` → return 200.

Registered in `index.ts`: `app.route('/api/settings', settingsRouter)`.

### D7: Frontend Settings Store — `$lib/stores/settings.svelte.ts`

```ts
export class SettingsStore {
  settings = $state<UserSettings>({
    ledgerViewMode: 'single',
    activePeriods: []
  });
  isLoaded = $state(false);

  async load(agentBaseUrl: string, token: string): Promise<void>;
  async save(partial: Partial<UserSettings>): Promise<void>;  // debounced PUT
}
export const settingsStore = new SettingsStore();
```

Loaded once on auth success (alongside `reedrichStore` initialization). The save method debounces by 500ms to batch rapid period additions.

### D8: UserSettings Shared Type — `packages/shared`

```ts
export interface UserSettings {
  ledgerViewMode: 'single' | 'calendar_board';
  activePeriods: string[];  // "YYYY-MM" format
  dateStartOfMonth?: number;
  language?: 'id' | 'en';
  mainCurrency?: 'IDR' | 'USD';
}
```

Added to `packages/shared/src/account-detail.ts` and re-exported.

## Component Hierarchy

```
/ledger (+page.svelte)
  LedgerHeader (existing, extended with ViewModeSwitcher)
    ViewModeSwitcher  [new: segmented control "List" | "Board"]
  FilterBar (existing, shared by both views)

  {#if viewMode === 'single'}
    ExistingSummaryStrip
    ExistingTransactionTable
    ExistingPagination
  {:else}
    HorizonBoard  [new]
      {#each orderedPeriods as period, i}
        HorizonPeriodColumn  [new]
          PeriodHeader (month label + quick-add + remove)
          PeriodLedgerTable (dense 2-line rows, scroll area)
          PeriodSummaryCard (cashflow + NW + goals)
      {/each}
      AddPeriodCard  [new: action card to append period]
  {/if}

  TransactionFormDrawer (existing, shared)
```

## Responsive Behavior

| Viewport | Columns per Row | View Modes Available |
|---|---|---|
| >= 1280px | 3–4 (auto-fill, min 340px) | List, Board |
| 1024px–1279px | 2 | List, Board |
| < 1024px | N/A | List only (Board hidden) |

On mobile (< 1024px): `settingsStore.settings.ledgerViewMode` is ignored; the single list view always renders. The view switcher component checks `window.innerWidth` (or a Svelte media query) before rendering.

## Data Contract Mapping

**Transaction data** — sourced from `reedrichStore.allTransactions` (populated via `GET /api/v1/transactions` with `fetchAllTransactions()`). Each period column slices by `transactionDate`.

**Net Worth & Wallet data** — sourced from `reedrichStore.snapshot` (populated via `GET /api/v1/account-detail`). The `calculatePointInTimeNetWorth` utility computes projections per period end date.

**Goals data** — sourced from `reedrichStore.activeGoals` (from `snapshot.goals`). Goal-to-wallet mapping via `GoalSnapshot.linkedWalletsBreakdown`.

**User Settings** — sourced from `GET /api/settings` via `settingsStore`. Written via `PUT /api/settings`.

## Test Strategy

### Vitest Unit Tests

1. **Cascading Net Worth Calculation** (`networth-timeline.test.ts` extension)
   - Test that serial accumulation of net flows across 3 periods produces correct closing Net Worth for each.
   - Test that editing a transaction in period 1 cascades to period 2 and 3 projections.

2. **Period Management Logic** (`settings.svelte.test.ts`)
   - Test default initialization (3 consecutive months from current date).
   - Test add period, remove period, minimum-1 constraint.
   - Test debounced save triggers after rapid additions.

3. **Settings API Handler** (`settings.test.ts` in `apps/agent`)
   - Test GET returns default for new user.
   - Test PUT upserts and merges partial payload.
   - Test PUT rejects invalid JSON.
   - Test 401 on missing auth.

4. **Per-Period Transaction Filtering** (`horizon-board.test.ts`)
   - Test that transaction slicing by period date range produces correct subsets.
   - Test that global filters (wallet, category) intersect correctly with period date range.

### Playwright E2E Tests

1. **Board Activation and Period Display**
   - Navigate to `/ledger`, switch to Board view, verify 3 period columns render.

2. **Add and Remove Period**
   - Add a 4th period, verify it appears. Remove a period, verify grid reflows.

3. **Transaction CRUD in Period Column**
   - Click "+ Transaksi" in October column, verify form opens with October date prefilled.
   - Submit a planned expense, verify it appears in October's table and November's Net Worth updates.

4. **Settings Persistence**
   - Switch to Board view, add a period, refresh the page, verify the same periods and view mode load.

## Risks

- **Performance with many periods (10+)**: Each period derives a filtered transaction subset. Mitigation: `$derived` computations are reactive and don't re-scan unless `allTransactions` changes. If needed, memoize period slicing with a SvelteMap keyed by period.
- **Stale settings on concurrent sessions**: Two browser tabs can overwrite each other. Acceptable for now; last-write-wins. The `updated_at` timestamp enables future conflict detection.
