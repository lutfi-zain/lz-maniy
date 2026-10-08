## Why

In live production traces (`maniyy-agent-production`), three observability defects prevent operators from inspecting full span trees and responses in Arize Phoenix: (1) `tracingMiddleware` flushes `WorkerTracer` immediately when `await next()` returns the streaming `Response`, before the `ReadableStream` executes tool calls (`tool:*` / `reedrich.rpc:*`), settles credits, or invokes `onFinish` (`output.value`), leaving `ai.streamText` as `UNSET` and dropping child tool spans; (2) internal spans (`creditPreCheck`, `creditSettlement`, `db.insertMessage`, and `reedrich-mcp` HTTP/DB spans) omit `'openinference.span.kind'`, causing Phoenix to label them `UNKNOWN`; and (3) `reedrich-mcp` (`finnplan-mcp`) HTTP spans omit `input.value` and `output.value` response payloads. Fixing stream-deferred flushing, OpenInference span kinds, and response body capture ensures every live trace renders a complete, unbroken waterfall with full inputs and outputs.

## What Changes

- **Deferred Trace Flushing for Streaming Responses (`apps/agent/src/middleware/tracing.ts`, `tracer.ts`, `routes/chat.ts`)**:
  - Add `tracer.deferFlush()` so streaming routes (`POST /api/chat` on both AI SDK and Native Gemini paths) prevent `tracingMiddleware` from flushing prematurely when `new Response(stream)` is returned.
  - Execute `rootSpan.end()` and `tracer.flushWithWaitUntil(c.executionCtx)` inside the `ReadableStream` `finally` block after `streamText` / `runGeminiStream` finishes, `output.value` is populated, `settleCredits` completes, and `db.insertMessage` is recorded.
- **Explicit OpenInference Span Kinds & Status Codes (`apps/agent` & `finnplan-mcp`)**:
  - Set `'openinference.span.kind': 'GUARDRAIL'` on `creditPreCheck` and `authMiddleware`, `'CHAIN'` on `creditSettlement`, `db.insertMessage`, and root HTTP spans, and set explicit `status: { code: 1 }` on `contextRetrieval` and `ai.streamText`.
  - Backfill any historical `UNKNOWN` / `UNSET` spans in the Phoenix PostgreSQL database so existing traces also display clean badges and response outputs.
- **HTTP Request/Response Payload Capture in `reedrich-mcp` (`/home/ubuntu/projects/finnplan-mcp`) & Live Worker Deployment**:
  - Update `/home/ubuntu/projects/finnplan-mcp/src/middleware/tracing.ts` to set `'openinference.span.kind': 'CHAIN'`, capture request query/body in `input.value`, and clone JSON responses into `output.value` (`output.mime_type: 'application/json'`).
  - Deploy both `maniyy-agent` and `reedrich-mcp` Cloudflare Workers so live production traffic immediately reflects these fixes.

### Scope Boundaries

- **In Scope**: Stream-deferred trace flushing in `apps/agent`, OpenInference span kind enrichment across `apps/agent` and `finnplan-mcp`, response payload capture in `finnplan-mcp`, historical Phoenix span backfill, unit tests, and Cloudflare Workers deployment.
- **Non-Goals (Out of Scope)**: Changing financial business logic or Svelte 5 UI components.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `agent-observability`: Require deferred trace flushing after `ReadableStream` completion on streaming routes, mandatory `openinference.span.kind` classification across all agent and MCP spans (zero `UNKNOWN` spans), and sanitized `input.value` / `output.value` capture on MCP HTTP spans.

## Impact

- **`apps/agent/src/observability/tracer.ts` & `src/middleware/tracing.ts`**: Add `deferFlush()` / `rootSpan` lifecycle control for streaming responses.
- **`apps/agent/src/routes/chat.ts` & `src/middleware/auth.ts`**: Set explicit `openinference.span.kind`, capture full assistant text in `output.value`, and flush traces after stream completion.
- **`/home/ubuntu/projects/finnplan-mcp/src/middleware/tracing.ts`**: Set `'openinference.span.kind': 'CHAIN'` and capture `input.value` / `output.value` on REST/MCP endpoints.
- **`apps/agent/src/__tests__/unit/tracing-route.test.ts`**: Unit tests verifying deferred flush after stream consumption and zero `UNKNOWN` span kinds.
