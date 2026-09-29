# Proposal

## Why

An automated scan using `impeccable detect` identified two design and performance anti-patterns within `apps/web/src`:
1. `ChatStreamingIndicator.svelte`: Uses Tailwind's `animate-bounce` for chat streaming dots (`[bounce-easing]`), creating a cartoonish, tacky motion profile that clashes with the *Editorial & Utilitarian Minimalism* design principles of Maniyy V2.
2. `apps/web/src/routes/+layout.svelte`: Uses `transition: padding-right 0.15s ease-out;` on the application root shell container (`[layout-transition]`), triggering full DOM reflow and layout thrashing across all child views (dense tables, card grids, KPI strips) on every animation frame when the chat panel opens or closes.

Fixing these anti-patterns ensures adherence to production design quality rules, eliminates unnecessary layout reflows, and elevates the tactile feel of the streaming and panel docking experiences.

## What Changes

- **Refactor `ChatStreamingIndicator.svelte`**: Replace `animate-bounce` with a subtle, calm opacity wave animation (`animate-pulse` staggered or keyframed opacity decrescendo) that decelerates smoothly without jumping.
- **Refactor `apps/web/src/routes/+layout.svelte`**: Remove the animated `transition: padding-right` from the root shell element. The desktop chat docking offset will apply instantaneously to the content margin/padding while the chat panel itself slides via GPU-accelerated `transform: translateX(...)`.
- **Pass Detector Quality Gate**: Re-run `/home/lutfizain/.agents/skills/impeccable/scripts/bin/linux-x64/impeccable detect apps/web/src` to verify 0 anti-patterns remain.
- **Verify Unit Tests & Typechecks**: Ensure `bun test:unit` and `bun run check` pass cleanly.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `agent-chat/frontend`: Refine `Streamed Message Rendering and UI Primitives` (subtle pulse-wave streaming indicator) and `Responsive Panel Layout and Docking` (performant non-thrashing panel docking without animated padding).

## Impact

- `apps/web/src/lib/components/chat/ChatStreamingIndicator.svelte`
- `apps/web/src/routes/+layout.svelte`
- Zero breaking changes.
