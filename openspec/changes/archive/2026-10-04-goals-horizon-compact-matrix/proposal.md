## Why

The Savings Goals Horizon Board currently renders large multi-column cards that are hidden on mobile devices and Android browsers running in desktop mode (due to the `< 1024px` media query and `hidden lg:inline-flex` CSS constraint). Furthermore, rendering bulky vertical cards across temporal periods creates excessive cognitive load and vertical scroll fatigue. Users need an ultra-compact, high-density financial overview accessible across all screen sizes to track goal milestones across multiple monthly periods at a glance.

## What Changes

- **Unified Ultra-Compact Horizon Matrix Table**: Refactor `GoalsHorizonBoard.svelte` from a multi-column card grid into an editorial matrix table where rows represent savings goals and columns represent chronological monthly horizons.
- **Frozen Sticky Goal Column**: Pin the first column (`sticky left-0 bg-white z-10 border-r border-[#EAEAEA]`) showing the goal name and target nominal amount, enabling seamless horizontal panning across future periods without losing goal context.
- **High-Density Cell Presentation**: Render compact 2-line cells (Line 1: progress percentage, milestone badge `✓ 100%`, or overdue badge `⚠️ Overdue`; Line 2: point-in-time accumulated balance in tabular IDR). Omit progress bars and linked wallet breakdowns from table cells to maximize vertical density (~44px row height).
- **Universal Mobile & Desktop Accessibility**: Update the List vs Horizon view mode switcher in `routes/planning/+page.svelte` from `hidden lg:inline-flex` to `inline-flex`, and remove the `!isMobile` restriction so Horizon mode can be toggled on mobile phones, tablets, and Android desktop-mode viewports.
- **Interactive Drawer Inspection**: Clicking any goal row in the matrix opens the slide-over `GoalDrawerContent`, preserving full access to linked wallet contributions, daily/monthly pacing metrics, and editing workflows.
- **Architectural Foundation**: Establish this matrix table as the canonical design pattern for future multi-period views across `/accounts` and `/ledger`.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `planning-studio`: Update the Savings Multi-Period Horizon Board requirements to specify the unified ultra-compact matrix table layout, frozen first column, 2-line cells, and universal device accessibility.

## Impact

- **Affected Files**:
  - `apps/web/src/lib/components/goals/GoalsHorizonBoard.svelte`: Refactor rendering structure into sticky-column table matrix.
  - `apps/web/src/routes/planning/+page.svelte`: Remove `!isMobile` guard and update switcher visibility to `inline-flex`.
- **List View**: Completely untouched; standard List cards retain their existing point-in-time date filtering and sorting behavior.
- **Breaking Changes**: None. Reuses existing `periodData` calculations and `fetchHorizonProjections()` endpoint.
