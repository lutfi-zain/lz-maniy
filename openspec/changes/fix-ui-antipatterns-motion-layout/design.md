# Design

## Context

See `proposal.md` for motivation.

Running `impeccable detect apps/web/src` revealed two specific anti-patterns:
1. `ChatStreamingIndicator.svelte` triggers `[bounce-easing]` via Tailwind's `animate-bounce`.
2. `+layout.svelte` triggers `[layout-transition]` via `transition: padding-right 0.15s ease-out;`.

## Goals / Non-Goals

**Goals:**
- Eliminate `[bounce-easing]` in `ChatStreamingIndicator.svelte` by converting the three streaming dots to a stationary staggered opacity wave using `animate-pulse`.
- Eliminate `[layout-transition]` in `+layout.svelte` by removing the animated `transition: padding-right` property from the root app shell container.
- Ensure `impeccable detect apps/web/src` reports 0 anti-patterns.
- Maintain 100% passing status for all unit tests (`vitest`) and SvelteKit typechecks (`svelte-check`).

**Non-Goals:**
- Reworking chat streaming SSE protocols or agent message schemas.
- Changing mobile fullscreen drawer behavior.

## Decisions

### 1. Stationary Staggered Pulse Wave for Chat Indicator

In `ChatStreamingIndicator.svelte`:
```svelte
<div class="flex justify-start">
	<div class="flex items-center gap-1 rounded-lg border border-[#eaeaea] bg-white px-3 py-2">
		<span class="size-1.5 rounded-full bg-[#787774] animate-pulse [animation-duration:1.2s] [animation-delay:0ms]"></span>
		<span class="size-1.5 rounded-full bg-[#787774] animate-pulse [animation-duration:1.2s] [animation-delay:200ms]"></span>
		<span class="size-1.5 rounded-full bg-[#787774] animate-pulse [animation-duration:1.2s] [animation-delay:400ms]"></span>
	</div>
</div>
```

*Rationale*:
- Eliminates vertical bouncing (`translateY`), keeping dots anchored on their baseline.
- Opacity gently pulses between 35% and 100%, indicating stream generation in a subtle, editorial manner.
- Conforms fully to `[bounce-easing]` rules and respects reduced motion.

### 2. Instant Padding Docking Without Reflow Thrashing

In `apps/web/src/routes/+layout.svelte`:
```svelte
<div
	class="flex min-h-screen w-full flex-col bg-[#F7F6F3] font-sans text-[#111111]"
	style={chatStore.panelOpen ? `padding-right: ${chatStore.panelWidth}px;` : undefined}
>
```

*Rationale*:
- Removing `transition: padding-right 0.15s ease-out;` prevents the browser from firing 9–18 sequential layout recalculation passes (reflows) on every open/close gesture.
- The chat drawer panel itself (`ChatPanel.svelte`) manages its own smooth GPU-accelerated enter/exit animation via CSS transforms (`translateX`).
- Eliminates `[layout-transition]` completely.

## Risks / Trade-offs

- **Risk**: User might notice content jumping if the drawer opens instantly without content shifting.
  - **Reality**: In desktop split-view apps (e.g. VS Code, Linear, Figma), sidebar/inspector docking shifts main workspace layout instantly while the panel slides in on top or pushes the canvas cleanly. Removing the 150ms padding animation eliminates janky card and table reflow.

## Test Strategy

1. **Quality Detector Gate**:
   - Execute `/home/lutfizain/.agents/skills/impeccable/scripts/bin/linux-x64/impeccable detect apps/web/src`.
   - Assert exit code 0 and "0 anti-patterns found".
2. **Quality Gates**:
   - `bun run --cwd apps/web check` (0 errors, 0 warnings).
   - `bun run --cwd apps/web test:unit` (100% passing tests).
   - `bun run --cwd apps/web build` (clean static bundle compilation).
