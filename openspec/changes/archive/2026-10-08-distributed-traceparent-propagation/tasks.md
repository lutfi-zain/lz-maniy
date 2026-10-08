## 1. Agent Tool Outbound W3C `traceparent` Propagation (`apps/agent`)

- [x] 1.1 Add active trace context tracking (`pushActiveTraceContext`, `popActiveTraceContext`, `getActiveTraceHeaders`) in `apps/agent/src/observability/tracer.ts` and bind it around tool execution in `apps/agent/src/observability/instrument-tools.ts`. (Verify: `bun run test:agent`)
- [x] 1.2 Update `createApiClient` in `apps/agent/src/agent/tools/http.ts` to inject `traceparent`, `x-project-name`, and `x-phoenix-project` headers from `getActiveTraceHeaders()` on all outgoing `fetch` and `fetcher.fetch` requests. (Verify: `bun run test:agent`)
- [x] 1.3 Update `createGeminiRunner` in `apps/agent/src/agent/gemini-native.ts` and `apps/agent/src/routes/chat.ts` to accept `tracer` and wrap native Gemini tools with `wrapToolsWithTracing(rawTools, tracer, { includeSubSpans: true })`. (Verify: `bun run test:agent`)

## 2. Dashboard REST Store W3C `traceparent` Propagation (`apps/web`)

- [x] 2.1 Update `ReedrichStore.request` in `apps/web/src/lib/stores/reedrich.svelte.ts` to generate and attach a W3C `traceparent` header (`00-<traceId>-<spanId>-01`) on all outgoing dashboard REST and CRUD requests unless already present in `init.headers`. (Verify: `bun run test:web`)

## 3. Unit Tests & Security Verification

- [x] 3.1 Create unit test suite `apps/agent/src/__tests__/unit/http-tracing.test.ts` verifying `traceparent` and `x-project-name` propagation from `createApiClient` inside `wrapToolsWithTracing` for both `fetch` and `Fetcher` service bindings. (Verify: `bun run test:agent`)
- [x] 3.2 Create unit test suite `apps/web/src/lib/stores/__tests__/reedrich-tracing.test.ts` verifying W3C `traceparent` header attachment across `ReedrichStore` read (`fetchSnapshot`, `fetchWallets`) and write (`createTransaction`) operations. (Verify: `bun run test:web`)
- [x] 3.3 Run full workspace unit tests, type checks, and secret credential scans to verify zero regressions and zero exposed secrets. (Verify: `bun run test:agent && bun run test:web && bun run check:web && bun scripts/check-secrets.ts`)
