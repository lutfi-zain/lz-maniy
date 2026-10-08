## Why

While `apps/web/src/lib/stores/chat.svelte.ts` already injects W3C `traceparent` headers into `POST /api/chat`, two critical downstream HTTP hops still omit W3C trace context propagation: (1) `apps/agent/src/agent/tools/http.ts` (`createApiClient`) does not forward `traceparent` or `x-project-name` when agent tools invoke the ReedRich MCP backend (`finnplan-mcp`), causing downstream MCP and PostgreSQL Hyperdrive spans to split into disconnected traces, and (2) `apps/web/src/lib/stores/reedrich.svelte.ts` (`ReedrichStore.request`) does not attach `traceparent` headers when the financial dashboard loads snapshots, transactions, or executes manual CRUD operations. Propagating W3C `traceparent` across both hops completes true end-to-end distributed tracing from Svelte 5 browser actions through `maniyy-agent` and `reedrich-mcp` into PostgreSQL.

## What Changes

- **Agent Tool Outbound W3C `traceparent` Propagation (`apps/agent/src/agent/tools/http.ts` & `tracer.ts`)**:
  - Maintain active trace context in `WorkerTracer` (`getActiveTraceHeaders()`) so that when `wrapToolsWithTracing` starts `tool:*` and `reedrich.rpc:*` spans, `createApiClient().request()` automatically injects `traceparent: 00-<traceId>-<activeSpanId>-01`, `x-project-name`, and `x-phoenix-project` into outgoing HTTP/Service-Binding requests to `reedrich-mcp`.
  - Pass `tracer` into `createGeminiRunner` (`apps/agent/src/agent/gemini-native.ts` & `apps/agent/src/routes/chat.ts`) and wrap native Gemini tools with `wrapToolsWithTracing` so both the AI SDK path and the native Gemini path propagate `traceparent` to `reedrich-mcp`.
- **Dashboard REST Client W3C `traceparent` Propagation (`apps/web/src/lib/stores/reedrich.svelte.ts`)**:
  - Update the central `private async request(url: string, init: RequestInit = {})` method in `ReedrichStore` to generate and attach a W3C `traceparent` header (`00-<traceId>-<spanId>-01`) on every outgoing dashboard REST and CRUD request unless one is already provided in `init.headers`.

### Scope Boundaries

- **In Scope**: Outbound `traceparent` and `x-project-name` injection in `apps/agent/src/agent/tools/http.ts`, active trace context tracking in `apps/agent/src/observability/tracer.ts` and `instrument-tools.ts`, native Gemini tool tracing in `gemini-native.ts`, dashboard REST `traceparent` injection in `apps/web/src/lib/stores/reedrich.svelte.ts`, and unit test coverage in both `apps/agent` and `apps/web`.
- **Non-Goals (Out of Scope)**: Modifying UI layouts or changing `reedrich-mcp` backend endpoints (which already parse `traceparent` and `x-project-name`).

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `agent-observability`: Require outbound W3C `traceparent` and `x-project-name` header propagation from agent tool HTTP clients (`createApiClient`) to `reedrich-mcp` and from `ReedrichStore.request` in `apps/web` on all dashboard REST and CRUD requests.

## Impact

- **`apps/agent/src/observability/tracer.ts` & `instrument-tools.ts`**: Active trace context accessor (`getActiveTraceHeaders`) and lifecycle binding around tool execution.
- **`apps/agent/src/agent/tools/http.ts`**: Automatic injection of `traceparent`, `x-project-name`, and `x-phoenix-project` headers into outgoing requests.
- **`apps/agent/src/agent/gemini-native.ts` & `apps/agent/src/routes/chat.ts`**: Wrap native Gemini tools with `wrapToolsWithTracing` using the request `tracer`.
- **`apps/web/src/lib/stores/reedrich.svelte.ts`**: Automatic `traceparent` header injection in `ReedrichStore.request()`.
- **`apps/agent/src/__tests__/unit/http-tracing.test.ts` & `apps/web/src/lib/stores/__tests__/reedrich-tracing.test.ts`**: Unit tests verifying `traceparent` propagation across both hops.
