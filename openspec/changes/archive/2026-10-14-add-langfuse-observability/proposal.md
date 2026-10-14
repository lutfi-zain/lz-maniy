## Why

While Arize Phoenix serves as the primary runtime APM and Promptfoo acts as the pre-deploy evaluation gatekeeper, adding Langfuse as a secondary observability and evaluation pair provides cross-platform validation, vendor redundancy, and cloud-hosted token/cost metrics. This capability must operate with zero overhead when disabled, require zero duplicate instrumentation, and strictly guarantee that no secret credentials leak into version control.

## What Changes

- **Dual-Exporter OTLP Pipeline**: Extend `WorkerTracer` in `apps/agent` to stream OpenTelemetry protobuf traces to Langfuse Cloud (`https://us.cloud.langfuse.com/api/public/otel/v1/traces`) alongside Arize Phoenix without duplicating instrumentation.
- **Toggleable via Environment**: Enable or disable Langfuse ingestion dynamically via `LANGFUSE_ENABLED` ("true" | "false") and verify presence of `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY`. When disabled, zero network calls to Langfuse are made.
- **Trace Context Propagation**: Add `langfuse.user.id`, `langfuse.session.id`, and `langfuse.release` attributes across root and nested spans to enable user and session drilldowns in the Langfuse dashboard.
- **Evaluation Runner Support**: Allow `apps/agent/eval/provider.ts` to export Promptfoo benchmark traces to Langfuse concurrently with Phoenix when Langfuse environment variables are provided.
- **Strict Credential Hygiene**: Ensure all Langfuse keys are resolved exclusively from Cloudflare Worker secrets or gitignored `.dev.vars`. No raw API keys (`sk-lf-...`) may ever be committed to tracked repository files or git history.

## Capabilities

### New Capabilities
<!-- None: this change extends the existing agent-observability capability. -->

### Modified Capabilities
- `agent-observability`: Extend the distributed tracing framework to support secondary dual-export to Langfuse via OTLP protobuf with environment toggle control and strict credential masking.

## Impact

- **Affected Systems**: `apps/agent` (Cloudflare Worker runtime, tracing middleware, `WorkerTracer`, `types.ts`, `eval/provider.ts`).
- **Dependencies**: Uses existing `@opentelemetry/otlp-transformer` and native `fetch` with `btoa`; no new npm dependencies required.
- **Breaking Changes**: None. Arize Phoenix streaming remains completely uninterrupted and unchanged.
