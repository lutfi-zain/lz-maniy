# Tasks

## 1. Motion & Layout Anti-Pattern Fixes

- [x] 1.1 Refactor `apps/web/src/lib/components/chat/ChatStreamingIndicator.svelte` to replace `animate-bounce` with a stationary staggered `animate-pulse` opacity wave.
- [x] 1.2 Refactor `apps/web/src/routes/+layout.svelte` to remove `transition: padding-right` from root container style.

## 2. Verification & Quality Gates

- [x] 2.1 Run Impeccable detector (`/home/lutfizain/.agents/skills/impeccable/scripts/bin/linux-x64/impeccable detect apps/web/src`) ensuring 0 anti-patterns are found.
- [x] 2.2 Run SvelteKit typecheck (`bun run --cwd apps/web check`) ensuring 0 errors and 0 warnings.
- [x] 2.3 Run Vitest unit tests (`bun run --cwd apps/web test:unit`) ensuring 100% passing suite.
- [x] 2.4 Run production static build (`bun run --cwd apps/web build`) ensuring clean compilation.
