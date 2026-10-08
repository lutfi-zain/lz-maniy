## Context

See `proposal.md` for motivation. Inspecting live trace `e3f24b311f5fdcd89fd01de637a17aae` (`trace_rowid = 1288`, `Span:1971`) in `maniyy-agent-production` revealed three concrete runtime issues:
1. **Premature Flush on Streaming Responses**: In Hono, `await next()` inside `tracingMiddleware` resolves as soon as `chatRouter.post('/', ...)` returns `new Response(transformedReadable)`. Because the `ReadableStream` is consumed asynchronously after `next()` returns, `tracingMiddleware`'s `finally` block flushed `tracer` while `ai.streamText` was still in-flight (`UNSET`, no `output.value`) and before `tool:*`, `reedrich.rpc:*`, `creditSettlement`, and `db.insertMessage` spans were created or completed.
2. **Missing `openinference.span.kind` on Internal and MCP Spans**: `creditPreCheck` (`Span 1962`) and `reedrich-mcp` HTTP spans (`Span 1967..1971`) did not set `'openinference.span.kind'`, causing Arize Phoenix to classify them as `UNKNOWN`.
3. **Missing Response Payload (`output.value`) on `reedrich-mcp` HTTP Spans**: `finnplan-mcp/src/middleware/tracing.ts` recorded `http.url` and `http.status_code` on `HTTP GET /api/v1/summary` (`Span 1971`), but did not capture the JSON response body into `output.value` or request parameters into `input.value`.

## Goals / Non-Goals

**Goals:**
- Defer `tracer.flushWithWaitUntil()` on streaming responses until the `ReadableStream` finishes streaming, `output.value` is recorded on `ai.streamText` and `rootSpan`, and post-stream D1 persistence completes.
- Ensure every span in `apps/agent` and `finnplan-mcp` sets an explicit `'openinference.span.kind'` (`CHAIN`, `GUARDRAIL`, `RETRIEVER`, `AGENT`, `LLM`, `TOOL`, `EVALUATOR`) and explicit `status: { code: 1 }`.
- Capture sanitized `input.value` (URL query/body) and `output.value` (cloned JSON response preview) on `finnplan-mcp` HTTP spans.
- Backfill existing `UNKNOWN` / `UNSET` spans (including trace `e3f24b311f5fdcd89fd01de637a17aae` and `Span:1971`) in the Phoenix PostgreSQL database and deploy both `maniyy-agent` and `reedrich-mcp` Workers.

**Non-Goals:**
- Changing financial calculation logic or frontend Svelte 5 components.

## Decisions

### Decision 1: `tracer.deferFlush()` & `tracer.rootSpan` Lifecycle Control
- **Choice**:
  - Add `public rootSpan?: WorkerSpan` and `public isFlushDeferred = false` (`deferFlush(): void`) on `WorkerTracer` in `apps/agent/src/observability/tracer.ts`.
  - In `tracingMiddleware` (`apps/agent/src/middleware/tracing.ts`), store `tracer.rootSpan = rootSpan`. In the `finally` block, if `tracer.isFlushDeferred` is `true`, skip `rootSpan.end()` and `tracer.flushWithWaitUntil(c.executionCtx)`.
  - In `apps/agent/src/routes/chat.ts`, call `tracer?.deferFlush()` before returning the streaming `Response` on both the Native Gemini path and the AI SDK `streamText` path. Inside the `ReadableStream`'s `finally` block (inside `c.executionCtx.waitUntil`), accumulate `fullAssistantText`, set `output.value` on `inferenceSpan` and `tracer.rootSpan`, complete `db.insertMessage`, end `tracer.rootSpan`, and call `await tracer.flush()`.
- **Rationale**: Guarantees that 100% of child spans created during streaming (`tool:*`, `reedrich.rpc:*`, `creditSettlement`, `db.insertMessage`) and the complete assistant response text (`output.value`) are present and ended before OTLP serialization occurs.

### Decision 2: Sanitized `input.value` & `output.value` Capture in `finnplan-mcp` `tracingMiddleware`
- **Choice**:
  - In `/home/ubuntu/projects/finnplan-mcp/src/middleware/tracing.ts`, set `'openinference.span.kind': 'CHAIN'` on `rootSpan`, set `input.value` to the request path + query string (or sanitized request body), and after `await next()`, clone `c.res` (`c.res.clone().text()`) when `content-type` includes `application/json` to record the first 4,000 characters in `output.value` (`output.mime_type: 'application/json'`).
- **Rationale**: Clicking any `HTTP GET /api/v1/*` or `HTTP POST /api/v1/*` span in Arize Phoenix (such as `Span:1971` `HTTP GET /api/v1/summary`) immediately displays the JSON response in the Phoenix Input/Output panel.

## Risks / Trade-offs

- **Response Cloning Overhead in `finnplan-mcp`**: Cloning large responses could add memory overhead if unbounded. Mitigation: Only clone `application/json` responses and slice to `4000` characters inside `waitUntil` before flushing.

## Test Strategy

- **Unit Tests (`apps/agent/src/__tests__/unit/tracing-route.test.ts`)**: Verify that `POST /api/chat` defers `tracer.flush()` until the response stream is consumed, populates `output.value` on both `ai.streamText` and `HTTP POST /api/chat`, and emits zero `UNKNOWN` span kinds.
- **Live Verification**: Backfill trace `e3f24b311f5fdcd89fd01de637a17aae` (`Span:1971`) in Phoenix PostgreSQL and deploy `maniyy-agent` and `reedrich-mcp` via `wrangler deploy`.
