## Why

The agent chat panel breaks down at narrow widths: the header is a single non-wrapping flex row (~490px of fixed content) that clips the close button at the 280px minimum width, markdown tables rendered by the agent overflow the `ChatBubble` `max-w-[88%]` constraint instead of scrolling, and there is no way to expand the panel beyond 50vw when reading wide agent output such as transaction tables. Separately, the Topbar Sync button only calls `fetchSnapshot()` without date params or cache clearing, so it never refetches the active page query; and post-mutation `invalidateAndRefresh()` covers only snapshot + wallets + recurring, leaving budgets, goals, and debts/loans stale until the user switches tabs.

## What Changes

- **Maximize toggle (desktop)**: Add a maximize/restore button to the panel header that expands the chat panel to a near-fullscreen overlay and restores the previous width on toggle. Persist panel width across sessions but never persist the maximized state.
- **Responsive header**: Rework the panel header so critical controls (conversation title, close) are never clipped at the 280px minimum width; secondary controls collapse progressively behind an overflow menu or icon-only states as width shrinks.
- **Scrollable markdown tables**: Wrap agent-rendered markdown tables in a horizontal scroll container so wide tables scroll inside the bubble instead of overflowing it.
- **Resize affordance**: Improve the resize handle hit area and add double-click to reset to the default width.
- **Active-page refetch on Sync**: Rewire the Topbar Sync button to refetch the active page query (transactions/wallets/budgets/goals/debts-loans per current route and date filter) with cache clearing, plus visible feedback (spinner + last-sync state).
- **Complete post-mutation refetch**: Extend `invalidateAndRefresh()` to also refetch budgets, goals, and debts/loans after every CRUD mutation, so no workbench shows stale data.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `agent-chat/frontend`: (`openspec/specs/agent-chat/frontend/spec.md`) Add maximize/restore behavior, responsive header non-clipping guarantees, and scrollable markdown table rendering.
- `financial-store`: (`openspec/specs/financial-store/spec.md`) Require Sync to refetch the active page and require post-mutation refresh to cover all entity collections.

## Impact

- **Non-Goals**:
  - Rendering live interactive Svelte components from agent output (registry + renderer + sandbox); out of scope for this change.
  - Master-detail (side-by-side conversation list) layout in maximized mode; the list remains a toggle.
  - Changes to streaming, tool invocation cards, credit/context indicators, or backend chat behavior.
  - Mobile overlay behavior (already fullscreen; unchanged).
 - **Breaking Changes**: None. Additive UI state (`maximized`) and CSS-only responsive adjustments.
 - **Dependencies**: None. No backend, schema, or API changes.
