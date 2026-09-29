# Spec Delta

## MODIFIED Requirements

### Requirement: Responsive Panel Layout and Docking
The chat UI SHALL render as a docked right-side panel on desktop viewports and as a fullscreen overlay on mobile viewports, adjusting the parent layout without animated layout transitions that induce browser reflow thrashing.

#### Scenario: Global Toggle from Topbar and Desktop Docking
- **WHEN** viewport width is $\ge$ 1024px (desktop) and user toggles the chat panel open or closed
- **THEN** the main layout container updates its padding/margin immediately without CSS `transition: padding-right` or layout thrashing
- **AND** the chat panel animates smoothly using hardware-accelerated transforms (`transform: translateX(...)`) and opacity
- **AND** child tables, metric strips, and card grids render stably without horizontal scrollbar flash.

### Requirement: Streamed Message Rendering and UI Primitives
The chat UI SHALL render conversation messages incrementally using shadcn-svelte chat primitives conforming to the Maniyy V2 minimalist-ui design language, using calm opacity-wave streaming indicators without bounce easing.

#### Scenario: Streaming Response Display with Calm Pulse Wave
- **WHEN** an assistant response is streaming from `POST /api/chat`
- **THEN** tokens render progressively inside a message bubble with a subtle, non-bouncing three-dot streaming indicator
- **AND** the dots animate using a smooth staggered opacity pulse wave (exponential/subtle pulse easing) instead of vertical bounce movement (`animate-bounce`)
- **AND** the animation respects `@media (prefers-reduced-motion: reduce)` by maintaining a static low-contrast visibility state.
