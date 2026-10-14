## 1. Environment & Types

- [x] 1.1 Update `apps/agent/src/types.ts` to include `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL`, and `LANGFUSE_ENABLED` in the Worker `Env` interface.
- [x] 1.2 Update `apps/agent/wrangler.toml` documentation comment for secrets and create `apps/agent/.dev.vars.example` with non-sensitive template placeholders (`pk-lf-placeholder`, `sk-lf-placeholder`).

## 2. Core WorkerTracer Dual-Exporter

- [x] 2.1 Extend `TracerConfig` in `apps/agent/src/observability/tracer.ts` with Langfuse configuration options and add helper method `isLangfuseEnabled()`.
- [x] 2.2 Refactor `WorkerTracer.flush()` to execute Phoenix and Langfuse exports concurrently via `Promise.allSettled()`, packaging the serialized protobuf payload with Basic Auth (`Authorization: Basic <base64>`) and `x-langfuse-ingestion-version: 4`.
- [x] 2.3 Populate Langfuse-specific trace attributes (`langfuse.user.id`, `langfuse.session.id`, `langfuse.release`) on root spans and spans with user/session context.

## 3. Middleware & Evaluation Runner Integration

- [x] 3.1 Update `apps/agent/src/middleware/tracing.ts` to inject Langfuse environment bindings from Hono context (`c.env`) into `WorkerTracer`.
- [x] 3.2 Update `apps/agent/eval/provider.ts` to pass `process.env.LANGFUSE_*` environment variables to `WorkerTracer` during Promptfoo eval benchmark runs.

## 4. Test Suite, Verification & Secret Hygiene

- [x] 4.1 Add unit tests in `apps/agent/src/observability/__tests__/tracer.test.ts` asserting that Langfuse export runs when enabled, stays silent when disabled, and isolates network errors from Phoenix.
- [x] 4.2 Execute unit test suite with `bun run test:agent` to ensure all agent tests pass.
- [x] 4.3 Execute pre-commit secret scans (`bun scripts/check-secrets.ts` and `bun scripts/check-secrets.ts --history`) to verify zero credential leakage before staging.
