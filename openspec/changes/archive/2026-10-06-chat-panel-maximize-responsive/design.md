## Context

See `proposal.md` — Why for background and motivation.

Current implementation status:

**Chat panel (`apps/web/src/lib/components/chat/`, `apps/web/src/lib/stores/chat.svelte.ts`):**
1. `ChatPanel.svelte` renders a fixed right-side `aside` with `style="width: {chatStore.panelWidth}px"` on desktop and a fullscreen overlay on mobile. No maximized state exists.
2. `chat.svelte.ts:33-34,140-147` holds `panelWidth` (clamped 280–50vw, persisted to `localStorage`) via `setPanelWidth()`. No `maximized` flag.
3. `ChatPanelHeader.svelte:11` is a single non-wrapping flex row with ~7 fixed items plus a truncating title; at 280px the trailing close/new-conversation buttons clip outside the panel.
4. `ChatResizeHandle.svelte` is a 4px (`w-1`) pointer-capture strip with no double-click reset.
5. `MarkdownContent.svelte` styles tables with `width: 100%` but no horizontal scroll wrapper; `pre` already has `overflow-x: auto`. `ChatBubble.svelte` constrains width to `max-w-[88%]`.

**Data freshness (`apps/web/src/lib/stores/reedrich.svelte.ts`, `Topbar.svelte`):**
6. `Topbar.svelte:135` Sync button calls `fetchSnapshot()` with no date params and no cache clearing; only the global account-detail snapshot, categories, and profile refresh.
7. `invalidateAndRefresh()` (line 856-858) clears `transactionCache` and refreshes snapshot + wallets + recurring templates — but not budgets, goals, or debts/loans. Every CRUD mutation calls it.
8. Page-level `$effect` hooks refetch on tab/filter change (e.g. `planning/+page.svelte` refetches goals/budgets/debts-loans only when `activeSubTab` changes), so same-tab data stays stale after a mutation resolved elsewhere.
9. `Topbar.svelte:21` already derives `pathname` from `page.url.pathname`, so route-aware Sync needs no new routing plumbing.

## Goals / Non-Goals

**Goals:**
- Desktop maximize/restore with width memory, non-persisted maximized flag.
- Header that never clips title or close at 280px via progressive collapse.
- Horizontally scrollable agent markdown tables inside bubbles.
- Sync button that refetches the active page query with cache clearing and visible outcome.
- Post-mutation refresh covering budgets, goals, and debts/loans.

**Non-Goals:**
- Master-detail conversation list in maximized mode; list stays a toggle.
- Route-level code splitting or new `/chat` page.
- Backend changes; all additive frontend/store work.

## Decisions

### Decision 1: Maximize as store flag with width memory
- **Choice**: Add `maximized = $state<boolean>(false)` plus `lastDockedWidth` to `ChatStore`. `toggleMaximize()` flips the flag; entering maximized stores the current `panelWidth`, exiting restores it. Never persist `maximized` to `localStorage`; always boot docked.
- **Rationale**: Matches the existing `panelOpen`/`panelWidth` pattern, survives reload sanely (docked at last width), and keeps `setPanelWidth()` clamping untouched while maximized (drag disabled in maximized state).
- **Alternatives Considered**:
  - CSS-only `:fullscreen` API: fights SvelteKit SPA layout and `position: fixed` stacking; store flag is deterministic and testable.

### Decision 2: Progressive header collapse, not wrapping
- **Choice**: Keep single-row header. Priority order: title (always, truncating) > close (always) > new-conversation > conversation-list toggle > model picker (icon-only under threshold) > thinking picker (hidden under threshold, accessible via model dropdown or overflow) > credit/context badges (hidden under threshold, surfaced via tooltip or overflow menu). Implement via CSS container queries on panel width or a `$derived` width-tier in the store.
- **Rationale**: Wrapping grows header height and steals message space; progressive collapse preserves one-row density at every width and guarantees the close button — the escape hatch — is never clipped.
- **Alternatives Considered**:
  - `flex-wrap`: rejected; two-row header at 280px costs ~40px of vertical chat space permanently.

### Decision 3: Table scroll wrapper in MarkdownContent
- **Choice**: Wrap rendered `table` elements in a `div` with `overflow-x: auto` (via marked renderer post-processing or CSS `display: block` wrapper), keeping existing table typography styles. `pre` behavior unchanged.
- **Rationale**: Minimal change, mirrors the proven `pre` pattern, no layout shift for narrow tables.
- **Alternatives Considered**:
  - Shrinking table font further: rejected; hurts readability of financial figures.

### Decision 4: Route-aware Sync dispatch in the store, not the Topbar
- **Choice**: Add `reedrichStore.syncActivePage(route: string)` that switches on route prefix (`/ledger`, `/accounts`, `/planning`, `/`) and re-executes that page's query set with current `dateFilterStore` range + `transactionCache.clear()`. Topbar passes its existing derived `pathname` and shows spinner via a new `isSyncing` flag plus `lastSyncAt` timestamp. Post-mutation `invalidateAndRefresh()` gains `fetchBudgets()`, `fetchGoals()`, and `fetchDebtsLoans()` in its `Promise.all`.
- **Rationale**: Keeps routing knowledge in one place, reuses each page's existing fetch signatures, and aligns Sync strength with post-mutation refresh (Sync becomes a superset, not a weaker sibling). `Topbar` already derives `pathname`, so no new imports there beyond the store call.
- **Alternatives Considered**:
  - Per-page `$effect` on a `storeVersion` bump: cleaner reactively but touches every page component; explicit dispatch is smaller and easier to verify per route.

## Risks / Trade-offs

- [Dropdown clipping at narrow widths] → Mitigation: model/thinking dropdowns anchor `right-0` within the panel; verify at 280px that `w-64` menus do not overflow the viewport, shrink menu width under the collapse threshold.
- [Sync on `/ledger` horizon-board mode refetches list query but not horizon projections] → Mitigation: `syncActivePage('/ledger')` refetches both the transaction envelope query and `fetchHorizonProjections` for active periods.
- [`invalidateAndRefresh` grows from 3 to 6 parallel fetches] → Mitigation: reuse `globalConcurrencyPool` (max 10) already gating all fetch paths; acceptable burst on explicit user action or mutation.
- [Maximized overlay vs `DrilldownDrawer` stacking] → Mitigation: keep chat `z-40`/maximized below drawer z-index conventions; verify drawer opens above maximized chat.

## Test Strategy

- **Unit (Vitest)**: store tests for `toggleMaximize` (width memory, non-persistence), `syncActivePage` route dispatch (each route triggers its query set), and extended `invalidateAndRefresh` (asserts budgets/goals/debts-loans fetch calls). Component render tests for header at 280px (close visible) and markdown table scroll wrapper presence.
- **E2E (Playwright)**: maximize/restore round-trip on desktop viewport; Sync button spinner + data refresh on `/ledger`; edit-budget-then-verify-without-tab-switch on `/planning`.
