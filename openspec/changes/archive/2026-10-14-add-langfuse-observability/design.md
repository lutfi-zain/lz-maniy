## Context

See `proposal.md` for overall motivation.

`apps/agent` runs as a Cloudflare Worker using Hono. Runtime tracing is currently handled by `WorkerTracer` (`apps/agent/src/observability/tracer.ts`), which creates OpenInference spans and serializes them to OpenTelemetry Protobuf bytes using `@opentelemetry/otlp-transformer`. Spans are transmitted over HTTP to Arize Phoenix (`PHOENIX_ENDPOINT`).

Langfuse v4 supports direct ingestion of OpenTelemetry traces via OTLP HTTP/Protobuf at `/api/public/otel/v1/traces` using HTTP Basic Authentication (`Authorization: Basic <base64(publicKey + ":" + secretKey)>`) and real-time header `x-langfuse-ingestion-version: 4`.

## Goals / Non-Goals

**Goals:**
- Implement a Dual-Exporter pattern in `WorkerTracer` that serializes traces once and exports concurrently to Arize Phoenix (primary) and Langfuse Cloud (secondary).
- Provide an environment-level toggle (`LANGFUSE_ENABLED`) and credential validation so Langfuse can be enabled or disabled with zero code modification.
- Enrich spans with Langfuse-recognized attributes (`langfuse.user.id`, `langfuse.session.id`, `langfuse.release`).
- Support dual-export during Promptfoo matrix evaluations in `apps/agent/eval/provider.ts`.
- Enforce strict credential hygiene: zero secrets committed to git, verified by `bun scripts/check-secrets.ts`.

**Non-Goals:**
- Installing the heavyweight `@langfuse/langfuse` Node SDK into the Cloudflare Worker runtime.
- Replacing Arize Phoenix as the primary APM and evaluation suite host.
- Instrumenting client-side SvelteKit browser components for Langfuse.

## Decisions

### 1. Dual-Exporter via Existing OTLP Protobuf Serializer
**Decision**: Use `ProtobufTraceSerializer.serializeRequest()` once and dispatch the resulting `Uint8Array` to both Phoenix and Langfuse via native `fetch()`.
**Rationale**: Avoids adding new npm packages to `apps/agent`. Cloudflare Worker bundle size remains minimal, and CPU serialization overhead is incurred only once per request.

### 2. Isolated Error Handling and Non-blocking Execution
**Decision**: Execute Phoenix and Langfuse exports concurrently inside `Promise.allSettled()`.
**Rationale**: If Langfuse Cloud experiences transient network errors, rate limiting, or invalid credentials, the failure is caught and logged via `console.warn` without affecting Phoenix trace delivery or user response streams. In streaming chat routes, flushing is scheduled via `executionCtx.waitUntil()`.

### 3. Environment Variable Configuration Schema
**Decision**: Configure Langfuse through the following bindings:
- `LANGFUSE_PUBLIC_KEY`: String (e.g. `pk-lf-...`)
- `LANGFUSE_SECRET_KEY`: String (e.g. `sk-lf-...`, kept in Cloudflare Secrets / `.dev.vars`)
- `LANGFUSE_BASE_URL`: String (defaults to `https://us.cloud.langfuse.com`)
- `LANGFUSE_ENABLED`: String `"true"` | `"false"` (defaults to `"true"` if keys are present)

**Resolution Rule**: Langfuse export is active if and only if:
```ts
const isLangfuseEnabled =
  config.langfuseEnabled !== false &&
  Boolean(config.langfusePublicKey?.trim()) &&
  Boolean(config.langfuseSecretKey?.trim());
```

### 4. Zero Hardcoded Secrets & Pre-Commit Audit
**Decision**:
- Never commit actual `sk-lf-...` keys in any tracked file, fixture, or OpenSpec artifact.
- Document keys in `apps/agent/wrangler.toml` under `# Secrets (set via wrangler secret put):`.
- Add placeholders to `apps/agent/.dev.vars.example`.
- Run `bun scripts/check-secrets.ts` and `bun scripts/check-secrets.ts --history` as an automated gate.

## System Sequence Diagram

```
[ User Request / Eval Run ]
           |
           v
   +---------------+
   |  WorkerTracer | <--- Single instrumentation pipeline
   +-------+-------+
           |
           | serializeRequest(readableSpans) -> protobufBytes
           |
     +-----+-----+
     |           |
(Phoenix)    (Langfuse, if LANGFUSE_ENABLED != false)
     |           |
     v           v
  POST to     POST to
  Phoenix     Langfuse (/api/public/otel/v1/traces)
  Endpoint    Basic Auth + x-langfuse-ingestion-version: 4
```

## Risks / Trade-offs

- **Risk: Double fetch overhead at Worker exit.**
  - *Trade-off*: Cloudflare Workers have a 30s CPU limit and standard subrequest limits.
  - *Mitigation*: Both requests are dispatched concurrently with 3000ms abort controller timeouts inside `c.executionCtx.waitUntil()`, meaning user TTFB is 100% unaffected.
- **Risk: Secret leakage during development.**
  - *Mitigation*: Local secrets reside strictly in `.dev.vars` (enforced in `.gitignore`). Automated pre-commit scanner blocks staging if regex `sk-lf-[a-f0-9-]+` is found.
