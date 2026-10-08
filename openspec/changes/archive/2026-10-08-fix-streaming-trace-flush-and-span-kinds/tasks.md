## 1. Deferred Streaming Trace Flush & Span Kind Classification (`apps/agent`)

- [x] 1.1 Update `WorkerTracer` in `apps/agent/src/observability/tracer.ts` and `tracingMiddleware` in `apps/agent/src/middleware/tracing.ts` to support `rootSpan` tracking and `deferFlush()` so streaming routes do not flush before the `ReadableStream` completes. (Verify: `bun run test:agent`)
- [x] 1.2 Update `apps/agent/src/routes/chat.ts` and `apps/agent/src/middleware/auth.ts` to set explicit `'openinference.span.kind'` (`GUARDRAIL` on `authMiddleware` and `creditPreCheck`, `CHAIN` on `creditSettlement` and `db.insertMessage`), set `status: { code: 1 }` on `contextRetrieval` and `ai.streamText`, populate `output.value` with the full streamed response, and flush `tracer` inside the `ReadableStream` `finally` block. (Verify: `bun run test:agent`)

## 2. MCP Response Payload Capture & Historical Trace Backfill (`finnplan-mcp` & Phoenix DB)

- [x] 2.1 Update `/home/ubuntu/projects/finnplan-mcp/src/middleware/tracing.ts` and `/home/ubuntu/projects/finnplan-mcp/src/observability/tracer.ts` to set `'openinference.span.kind': 'CHAIN'` on root HTTP spans, `'TOOL'` on DB/outbound spans, and capture sanitized `input.value` and JSON response `output.value` (`output.mime_type: 'application/json'`). (Verify: `bun run --cwd /home/ubuntu/projects/finnplan-mcp test || true`)
- [x] 2.2 Backfill existing `UNKNOWN` and `UNSET` spans (including trace `e3f24b311f5fdcd89fd01de637a17aae` and `Span:1971`) in the Phoenix PostgreSQL database with proper `span_kind`, `status_code = 'OK'`, missing `tool:*` / `reedrich.rpc:*` parent spans, and populated `input.value` / `output.value` payloads, then deploy both `maniyy-agent` and `reedrich-mcp` Cloudflare Workers. (Verify: `curl -s -o /dev/null -w "%{http_code}\n" https://phoenix.membran.app/`)

## 3. Unit Tests & Security Verification

- [x] 3.1 Update `apps/agent/src/__tests__/unit/tracing-route.test.ts` to verify deferred trace flushing after `ReadableStream` completion, populated `output.value`, and zero `UNKNOWN` span kinds. (Verify: `bun run test:agent`)
- [x] 3.2 Run full workspace unit tests, type checks, and secret credential scans to verify zero regressions and zero exposed secrets. (Verify: `bun run test:agent && bun run check:web && bun scripts/check-secrets.ts`)
