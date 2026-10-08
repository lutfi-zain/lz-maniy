## Context

See `proposal.md` for motivation. Currently:
1. `apps/web/src/lib/stores/chat.svelte.ts` generates and sends `traceparent` to `POST /api/chat`.
2. `apps/agent/src/middleware/tracing.ts` parses the incoming `traceparent` and initializes `WorkerTracer`.
3. However, `apps/agent/src/agent/tools/http.ts` (`createApiClient`) only sends `Authorization`, `X-Api-Key`, and `Content-Type` headers when calling `reedrich-mcp` (`finnplan-mcp`). Because `finnplan-mcp` (`src/middleware/tracing.ts`) already parses `traceparent` and `x-project-name`, injecting those headers in `http.ts` immediately stitches `maniyy-agent` and `reedrich-mcp` spans into a single unified cross-worker trace tree.
4. Similarly, `apps/web/src/lib/stores/reedrich.svelte.ts` (`ReedrichStore.request`) routes all 29 dashboard read and CRUD methods through a single `private async request(url, init)` method that currently omits `traceparent`.

## Goals / Non-Goals

**Goals:**
- Propagate `traceparent`, `x-project-name`, and `x-phoenix-project` automatically in `apps/agent/src/agent/tools/http.ts` (`createApiClient`) using the currently executing span context from `WorkerTracer`.
- Ensure both the Vercel AI SDK path and the native Gemini path (`createGeminiRunner` in `apps/agent/src/agent/gemini-native.ts`) wrap tools with `wrapToolsWithTracing`.
- Inject a W3C `traceparent` header in `ReedrichStore.request()` (`apps/web/src/lib/stores/reedrich.svelte.ts`) for all dashboard REST and CRUD requests.
- Add unit tests in `apps/agent` and `apps/web` verifying header injection and format compliance.

**Non-Goals:**
- Changing `finnplan-mcp` (which already supports `traceparent` and `x-project-name` in CORS and `tracingMiddleware`).

## Decisions

### Decision 1: Active Trace Context Accessor in `WorkerTracer` (`tracer.ts` & `instrument-tools.ts`)
- **Choice**:
  - Add a lightweight active trace context stack (`pushActiveTraceContext` / `popActiveTraceContext` / `getActiveTraceHeaders`) in `apps/agent/src/observability/tracer.ts`.
  - When `wrapToolsWithTracing` starts `toolSpan` and `rpcSpan`, it pushes `{ traceId: tracer.traceId, spanId: (rpcSpan ?? toolSpan).spanId, projectName: tracer.projectName }` onto the active context stack for the duration of `executeFn(args, options)` and pops it in `finally`.
  - `createApiClient` in `apps/agent/src/agent/tools/http.ts` calls `getActiveTraceHeaders()` inside `request()` and merges those headers (`traceparent`, `x-project-name`, `x-phoenix-project`) before calling `fetcher.fetch` or `fetch`.
- **Rationale**: Zero signature churn across the 8 tool factory modules (`financial.ts`, `mutations.ts`, `wallet-management.ts`, `budget-management.ts`, `debt-loan.ts`, `goal-management.ts`, `recurring.ts`, `feedback.ts`) while guaranteeing that every outbound HTTP/Service-Binding request carries the exact `rpcSpan.spanId` as its W3C parent span.

### Decision 2: Central W3C `traceparent` Injection in `ReedrichStore.request()` (`reedrich.svelte.ts`)
- **Choice**:
  - Export `generateTraceParent()` (or import from a shared client helper) in `apps/web/src/lib/stores/reedrich.svelte.ts` and set `if (!headers.has('traceparent')) { headers.set('traceparent', generateTraceParent()); }` inside `private async request(url: string, init: RequestInit = {})`.
- **Rationale**: All 29 dashboard read and CRUD methods in `ReedrichStore` funnel through `this.request()`, so instrumenting that single method provides 100% coverage across `/accounts`, `/ledger`, and `/planning` without duplicating code.

## Risks / Trade-offs

- **CORS Preflight Compatibility**: `finnplan-mcp` (`src/index.ts` line 66) already explicitly whitelists `traceparent, Traceparent, x-project-name, x-phoenix-project` in `Access-Control-Allow-Headers`, so browser requests from `ReedrichStore` pass CORS preflight with zero backend changes.

## Test Strategy

- **Agent Unit Tests (`apps/agent/src/__tests__/unit/http-tracing.test.ts`)**: Verify that `createApiClient` inside `wrapToolsWithTracing` injects `traceparent: 00-<traceId>-<rpcSpanId>-01` and `x-project-name` into both `globalThis.fetch` and Cloudflare `Fetcher` service bindings.
- **Web Unit Tests (`apps/web/src/lib/stores/__tests__/reedrich-tracing.test.ts`)**: Verify that `ReedrichStore` read (`fetchSnapshot`, `fetchWallets`) and write (`createTransaction`) calls attach a valid W3C `traceparent` header.
