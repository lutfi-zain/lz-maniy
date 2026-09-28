# Proposal

## Why

The user currently manages personal finances via a Telegram bot (Eve Finn, 1593+ messages) that handles natural-language CRUD, multi-step projections, anomaly detection, and financial planning through MCP tool calls to the Reedrich backend. This workflow is disconnected from the Maniyy V2 dashboard — the bot cannot see what the user sees, and the user must context-switch between Telegram and the web UI. An embedded agent chat panel that shares UI context, navigates pages, and operates filters would unify the experience and enable richer interactions grounded in the visible financial state.

## What Changes

- **Restructure to Bun workspaces monorepo**: Move the SvelteKit app to `apps/web/`, add `apps/agent/` (CF Worker) and `packages/shared/` (types + constants). Single lockfile, `workspace:*` resolution.
- **New agent backend** (`apps/agent/`): Cloudflare Worker using Vercel AI SDK `streamText` with tool calling (`maxSteps`). Supports Gemini and Groq providers via system-owned API keys. Authenticates users by passthrough of existing Reedrich OAuth tokens (no second login). Persists chat history in CF D1, config in CF KV.
- **Agent tools**: All existing Reedrich REST API endpoints exposed as AI SDK tools (snapshot, transactions CRUD, transfers, categories). UI command tools (navigate page, change filter/tab, open drawer, open transaction form, focus element) that return structured commands the browser interprets and executes.
- **New chat panel UI** (`apps/web/`): Right-side resizable panel (default 20% width) on desktop, fullscreen overlay on mobile. Collapsible in both modes. Uses shadcn-svelte chat primitives (MessageScroller, Message, Bubble) with the project's minimalist-ui design system. Model/provider picker, conversation list, export/import.
- **Shared types package** (`packages/shared/`): Extracts `AccountDetail`, `TransactionRecord`, `CategoryRecord`, `UserProfileDTO` and adds `ChatMessage`, `UICommand`, `PageContext` types consumed by both apps.
- **Testing**: Unit tests (Vitest, Node env) for pure agent logic. Integration tests (Vitest Workers Pool, in-memory D1, mocked Reedrich/LLM) for agent endpoints. Dedicated Reedrich test account (`rd_live_6133a5ec3ca3c2fc1d224f677cc31c13`, user `testbot@maniyy.dev`) with seeded fixture data. E2E tests are manual (documented in tasks).
- **CI/CD**: Path-filtered GitHub Actions — `deploy-web.yml` for `apps/web/**` + `packages/shared/**`, `deploy-agent.yml` for `apps/agent/**` + `packages/shared/**`. Both use `wrangler` for deployment.
- **CF infrastructure**: New Worker project `maniyy-agent` with D1 database binding, KV namespace binding, and secrets for Gemini/Groq API keys.

## Capabilities

### New Capabilities

- `agent-chat/backend`: Agent backend service — CF Worker with AI SDK, tool calling, streaming, multi-user session management, Reedrich REST passthrough auth
- `agent-chat/frontend`: Chat panel UI — resizable panel, mobile fullscreen, model picker, conversation management, UI command execution, image attachment with graceful cache degradation
- `agent-chat/shared-types`: Shared TypeScript types and constants between web and agent workspaces
- `agent-chat/infra`: Monorepo structure, CF Worker/D1/KV provisioning, CI/CD pipelines, Wrangler configuration

### Modified Capabilities

_None. Existing financial UI capabilities are unchanged. The chat panel is additive — it overlays on the existing app shell without modifying current routes or stores._

## Non-Goals

- Server-side rendering or changing `adapter-static` — the SvelteKit app remains a static SPA
- PDF parsing or document understanding — deferred to a future backend
- Screenshot-based UI awareness (Level 3) — current scope is Level 2 (store/state reading)
- MCP protocol between agent and Reedrich — uses REST API for simplicity
- User-provided (BYOK) LLM API keys — system keys only
- Vercel EVE framework — not deployable to CF Workers
