## Context

See `proposal.md` — Why for background and motivation.

Current implementation status:
1. **Ledger `onMount` (`apps/web/src/routes/ledger/+page.svelte:98-130`)**: Reads `walletId`, `category`, `type`, `datePreset`, `startDate`, `endDate`, `budgetId`, `budget` from `page.url.searchParams`, but omits `search`. Planning links at `apps/web/src/routes/planning/+page.svelte` (lines 472, 694, 725, 788) send `href="/ledger?search=..."`.
2. **Horizon DTO Type (`packages/shared/src/account-detail.ts:419-423`)**: `HorizonPeriodSummary.cashflow` only defines `{ income: number; expense: number; net: number }`.
3. **Period Summary Card (`apps/web/src/lib/components/ledger/PeriodSummaryCard.svelte:15-27,64-87`)**: `PeriodSummary` interface defines `income`, `expense`, `net`, and Layer 1 displays only these three lines.
4. **Horizon Board (`apps/web/src/lib/components/ledger/HorizonBoard.svelte:78-81,138-151`)**: Maps `srvPeriod?.cashflow` into `periodSummaries` passing only `income`, `expense`, `net`.

## Goals / Non-Goals

**Goals:**
- Enable inbound URL search parameter parsing in Ledger `onMount` so all cross-page links from Planning work seamlessly.
- Extend `HorizonPeriodSummary` with optional `netSpendable` and `netLocked`.
- Update `PeriodSummaryCard` to render the cashflow liquidity decomposition when present.
- Clarify `PeriodSummaryCard` Net Worth label based on temporal position (past, current, future).
- Maintain 100% backward compatibility when the backend does not return `netSpendable`/`netLocked`.

**Non-Goals:**
- Rewriting backend API endpoints (handled in finnplan-mcp).
- Modifying Accounts page Net Worth calculation.
- Adding cashflow decomposition to the Ledger List View summary strip.

## Decisions

### Decision 1: Query Param Reading Order in `onMount`
- **Choice**: Read `qSearch = page.url.searchParams.get('search')` alongside existing param checks. If present, assign to local `$state` variable `searchKeyword`.
- **Rationale**:
  - `searchKeyword` has a bidirectional Svelte 5 `$effect` syncing with `ledgerFilterStore.searchKeyword` (line 67-69).
  - The server query `$effect` (line 190-244) tracks `searchKeyword` and automatically triggers `reedrichStore.fetchTransactions({ q: keyword.trim() || undefined, ... })`.
  - The search `<input>` is bound to `searchKeyword`, so the UI immediately reflects the keyword without extra code.
- **Alternatives Considered**:
  - Syncing through `ledgerFilterStore.searchKeyword` directly: local `$state` is the source of truth in the component, and the `$effect` syncs downward. Setting local `searchKeyword` directly is the consistent pattern with `selectedBudgetIds`, `selectedWalletIds`, and `selectedType`.

### Decision 2: Additive Type Extension in `packages/shared`
- **Choice**:
  ```ts
  export interface HorizonPeriodSummary {
    // ...
    cashflow: {
      income: number;
      expense: number;
      net: number;
      netSpendable?: number;
      netLocked?: number;
    };
    // ...
  }
  ```
- **Rationale**: Mark fields optional (`?`) to ensure runtime safety if an older API or mock returns data without them.

### Decision 3: Sub-Breakdown Visual Placement in `PeriodSummaryCard`
- **Choice**: Render the decomposition immediately below the Outflow row, separated by a subtle dotted or solid line (`border-t border-[#EAEAEA] pt-1.5`):
  ```
  +--------------------------------------------+
  | NET CASHFLOW                    +Rp 8.97jt |
  |   Inflow                        +Rp 20.4jt |
  |   Outflow                       −Rp 11.5jt |
  |   ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈    |
  |   ● Net Operasional             +Rp 1.97jt |
  |   ● Net Cadangan                +Rp 7.00jt |
  +--------------------------------------------+
  ```
  - Conditional: `{#if summary.netSpendable !== undefined && summary.netLocked !== undefined}`
  - Format: `+` for positive, `−` for negative, matching `summary.net` style.
  - Dot indicators: `bg-[#346538]` (green) for Operasional, `bg-[#956400]` (amber) for Cadangan — matching the project's ubiquitous design language.

### Decision 4: Disambiguating Net Worth Temporal Labels
- **Choice**: In `PeriodSummaryCard`, use the existing `summary.label` passed from `HorizonBoard.svelte` (which already computes `'PROYEKSI AKHIR BULAN'` vs `'PROYEKSI NET WORTH'` vs `'NET WORTH PENUTUPAN'`):
  ```ts
  // In HorizonBoard.svelte:
  const currYearMonth = new Date().toISOString().slice(0, 7);
  let label: string = 'PROYEKSI AKHIR BULAN';
  if (periodKey > currYearMonth) label = 'PROYEKSI NET WORTH';
  else if (periodKey < currYearMonth) label = 'NET WORTH PENUTUPAN';
  ```
  In `PeriodSummaryCard.svelte`, use this `summary.label` for the heading instead of the hardcoded key to avoid confusion between live balance and projected balance.

## Risks / Trade-offs

- **Risk**: API returns `null` or omits `netSpendable` for older periods or custom intervals.
  - **Mitigation**: Guard with `summary.netSpendable !== undefined && summary.netLocked !== undefined`. If omitted, the card renders identically to the current production design.
- **Risk**: Search term from URL may contain URL-encoded characters.
  - **Mitigation**: `page.url.searchParams.get('search')` automatically URL-decodes the value. No manual `decodeURIComponent` needed.

## Test Strategy

- **Unit Tests (Vitest)**:
  - Add test in `apps/web` verifying that `PeriodSummaryCard` renders the liquidity decomposition rows when `netSpendable` and `netLocked` are provided.
  - Add test verifying that `PeriodSummaryCard` omits the decomposition rows when those fields are absent.
- **Type Checking**: Full workspace `bun run check:web` to ensure `packages/shared` types propagate cleanly without regressions across `apps/web` and `apps/agent`.
