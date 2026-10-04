## Context

See `proposal.md` for problem background. The Reedrich edge API supports point-in-time querying on `GET /api/v1/wallets?startDate=...&endDate=...&filter=all`. When dates are provided, the API response attaches a `snapshot` object containing:
- `startDate`: string (ISO)
- `endDate`: string (ISO)
- `filter`: 'realized' | 'planned' | 'all'
- `initialBalance`: number
- `totalIn`: number
- `totalOut`: number
- `periodDelta`: number
- `totalBalance`: number (the calculated closing balance at `endDate`, including realized mutations up to `endDate` and, for future periods, planned income/expenses)

In `ReedrichStore.fetchWallets()`, the mapping previously discarded the `snapshot` object and read only `w.walletBalance`, which is the user's current live balance.

## Goals / Non-Goals

**Goals:**
- Update `RawWalletEntry` and `fetchWallets()` in `reedrich.svelte.ts` to map `balance` from `w.snapshot?.totalBalance ?? w.walletBalance ?? w.balance ?? 0`.
- Preserve existing fallbacks: when no date parameters are passed, or when the endpoint returns no snapshot, fallback cleanly to `w.walletBalance`.
- Ensure derived state on `/accounts` (`allWallets`, `filteredWallets`, `sortedWallets`, `groupedInstitutions`, and `timelineNetWorth`) automatically reflects the point-in-time balances without requiring manual recalculations or duplicate client-side aggregation.
- Validate behavior with Vitest unit tests in `reedrich.test.ts` and automated end-to-end check in Playwright.

**Non-Goals:**
- Modifying the Reedrich backend or Cloudflare Workers API contracts (the backend already returns `snapshot.totalBalance` correctly).
- Altering the Horizon Board logic (Horizon Board already fetches via its dedicated `/api/v1/analytics/horizon` or `fetchAccountsHorizonBoard` projection pipeline).
- Changing transaction drilldown drawers or mutation forms.

## Decisions

### 1. Fallback Order for Wallet Balance
**Decision:**
```typescript
interface RawWalletSnapshot {
    startDate?: string;
    endDate?: string;
    filter?: string;
    initialBalance?: number;
    totalIn?: number;
    totalOut?: number;
    periodDelta?: number;
    totalBalance?: number;
}

interface RawWalletEntry {
    walletId: string;
    walletName: string;
    walletInstitution?: string;
    institution?: string;
    walletType?: WalletItem['type'];
    type?: WalletItem['type'];
    walletBalance?: number;
    balance?: number;
    walletCurrency?: string;
    currency?: string;
    walletIsLocked?: 0 | 1;
    isLocked?: 0 | 1;
    lastTransaction?: WalletItem['lastTransaction'];
    snapshot?: RawWalletSnapshot;
}
```
In the `map` callback:
```typescript
balance: w.snapshot?.totalBalance ?? w.walletBalance ?? w.balance ?? 0
```
**Rationale:**
- When `startDate` and `endDate` are provided, the backend calculates the exact point-in-time or projected balance in `snapshot.totalBalance`.
- If the endpoint returns no snapshot (e.g., standard live fetch), `w.snapshot` is undefined, falling back to `w.walletBalance` or `w.balance`.
- This ensures zero breakage for default calls while instantly unlocking accurate balances for any date filter.

### 2. State & Component Flow in Svelte 5
**Flow:**
```
DateRangePicker (user selects date / preset)
       │
       ▼
dateFilterStore (startDate, endDate, preset)
       │
       ▼
accounts/+page.svelte: $effect watches (start, end)
       │
       ▼
reedrichStore.fetchWallets({ startDate, endDate }, signal)
       │
       ▼
GET /api/v1/wallets?startDate=...&endDate=...
       │
       ▼
reedrichStore.activeWallets = items (mapped with snapshot.totalBalance)
       │
       ├──► allWallets (derived: activeWallets > 0 ? activeWallets : fallback)
       │      │
       │      ├──► filteredWallets & sortedWallets
       │      │      └──► WalletCard (renders w.balance with fmtCurrency)
       │      │
       │      ├──► groupedInstitutions (calculates subtotal per bank)
       │      │
       │      └──► timelineNetWorth (macro KPI tiles: Total, Spendable, Committed)
```
**Rationale:**
All downstream reactive dependencies on `/accounts` (`groupedInstitutions`, `timelineNetWorth`, `sortedWallets`) already read `w.balance` via `getWalletBalance(w)`. By updating `w.balance` at the `activeWallets` store root, all UI representations (cards, bank groups, macro KPI headers) update reactively and atomically without component-level refactoring.

### 3. Responsive Layout Preservation
- **Desktop (>= 1024px):** User toggles between List view and Horizon Board. List view displays the 3-column macro summary header, search bar, date range picker, and grouped bank accordion.
- **Mobile (< 1024px):** Always locks to List view. The date range picker dropdown and reset button remain accessible, with full-width wallet cards. Point-in-time values update identically on mobile.

## Test Strategy

1. **Unit Tests (`apps/web/src/lib/stores/reedrich.test.ts`):**
   - Test: `fetchWallets` with `startDate` and `endDate` queries maps `w.snapshot.totalBalance` into `WalletItem.balance`.
   - Test: `fetchWallets` without dates falls back to `w.walletBalance`.
   - Test: `fetchWallets` with future planned interval correctly extracts projected `snapshot.totalBalance`.

2. **Integration / E2E Verification:**
   - Run Vitest suite: `bun test` in `apps/web`.
   - Run type checks: `bun run check:web`.
   - Smoke test via browser to confirm:
     - Selecting *Last Month* changes BCA balance from live (19.3M) to closing (6.5M).
     - Selecting *Next Month* changes BCA balance from live (19.3M) to projected (25.3M).
     - Total Net Worth tile updates from live (30.8M) to matching historical/projected totals.

## Risks / Trade-offs

- **Risk: Discrepancy if backend `snapshot.totalBalance` is negative (overdraft).**
  - *Mitigation:* `fmtCurrency` and `getConvertedBalanceInIDR` support negative balances without throwing, rendering as standard negative amounts.
- **Risk: Stale `activeWallets` when switching routes.**
  - *Mitigation:* Each page (`/accounts`, `/`) already manages its own point-in-time synchronization in `$effect`, dispatching fresh queries when temporal state changes.
