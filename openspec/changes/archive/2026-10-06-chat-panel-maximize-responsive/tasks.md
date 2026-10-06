## 1. Chat Panel Maximize & Responsive Header

- [x] 1.1 Add `maximized` state with width memory to `ChatStore` in `apps/web/src/lib/stores/chat.svelte.ts` (`maximized` flag, `lastDockedWidth`, `toggleMaximize()`; never persist maximized to `localStorage`).
- [x] 1.2 Add maximize/restore toggle button to `ChatPanelHeader.svelte` and render maximized overlay layout in `ChatPanel.svelte` on desktop (restore returns previous docked width; drag disabled while maximized).
- [x] 1.3 Rework `ChatPanelHeader.svelte` to progressive collapse (title + close always visible; model/thinking pickers collapse to icon-only then overflow below width thresholds; verify close button reachable at 280px).
- [x] 1.4 Widen `ChatResizeHandle.svelte` hit area and add double-click to reset `panelWidth` to default.

## 2. Scrollable Agent Markdown Tables

- [x] 2.1 Wrap rendered tables in a horizontal scroll container in `MarkdownContent.svelte` so wide agent tables scroll inside `ChatBubble` instead of overflowing it; keep existing table typography styles.
- [x] 2.2 Add component render tests verifying the scroll wrapper exists and narrow tables render unchanged.

## 3. Sync Refetch & Post-Mutation Freshness

- [x] 3.1 Extend `invalidateAndRefresh()` in `apps/web/src/lib/stores/reedrich.svelte.ts` to also refetch `fetchBudgets()`, `fetchGoals()`, and `fetchDebtsLoans()` alongside snapshot, wallets, and recurring templates.
- [x] 3.2 Add route-aware `syncActivePage(route)` to `reedrichStore` dispatching per route (`/ledger`: transaction query + horizon projections; `/accounts`: wallets; `/planning`: active sub-tab entities; `/`: snapshot) with cache clearing, plus `isSyncing` and `lastSyncAt` state.
- [x] 3.3 Rewire the Topbar Sync button in `apps/web/src/lib/components/layout/Topbar.svelte` to call `syncActivePage(pathname)` with spinner/disabled state and last-sync feedback.
- [x] 3.4 Add store unit tests for `toggleMaximize`, `syncActivePage` route dispatch, and extended `invalidateAndRefresh` coverage.

## 4. Test Suites & Verification

- [x] 4.1 Run `bun run test:web` to ensure all unit tests pass without regressions.
- [x] 4.2 Run `bun run check:web` to confirm zero TypeScript or Svelte 5 compilation errors across the workspace.
- [x] 4.3 Run `bun scripts/check-secrets.ts` and `bun scripts/check-secrets.ts --history` to ensure no credentials or secrets were introduced.
