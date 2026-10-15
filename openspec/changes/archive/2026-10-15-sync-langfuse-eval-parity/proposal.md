## Why

Maniyy's dual-observability architecture integrates Arize Phoenix (self-hosted APM) and Langfuse Cloud (secondary cross-eval/observability pair) as identical twins. However, while Phoenix possesses a mature evaluation suite (8 registered `annotation_configs`, continuous evaluation trace annotations, 5 experiment matrices with 135 runs, and custom provider bindings), Langfuse Cloud currently has 0 score configurations, 0 experiment runs, and no continuous eval score ingestion. 

Scores calculated during runtime (`evaluateTurn` in `apps/agent/src/routes/chat.ts`) are currently recorded solely as OpenTelemetry span attributes, leaving the Langfuse "Scores" and analytics dashboards empty. Furthermore, user feedback ingestion streams unconfigured scores without schema constraints, benchmark runs are not synchronized to Langfuse Dataset Runs, model token costs show as $0.00, and Telegram incident alerts lack direct trace deep links. Achieving 100% operational parity between Phoenix and Langfuse requires establishing synchronized Score Configs, runtime score streaming, dataset run exports, and enriched incident alerting.

## What Changes

- **Synchronized Langfuse Score Configurations**: Implement `syncLangfuseScoreConfigs` in `apps/agent/eval/observability-sync.ts` registering 8 canonical score configs (`financial_grounding_judge`, `advisory_rubric_judge`, `multi_intent_completeness`, `idr_currency_compliance`, `tool_dispatch_accuracy`, `credit_settlement_audit`, `human_audit_review`, `user_feedback`, and `latency_ms`) matching Phoenix `annotation_configs` via `POST /api/public/score-configs`.
- **Runtime Continuous Evaluation Score Streaming**: Update `apps/agent/src/routes/chat.ts` to stream evaluated turn scores (`evalNumericGrounding`, `evalCurrencyGovernance`, `evalNoEmoji`, `evalLockedCashGuard`) to the Langfuse Scores API (`POST /api/public/scores`) asynchronously in `c.executionCtx.waitUntil()` alongside existing span attributes.
- **Config-Bound User Feedback Ingestion**: Update `apps/agent/src/routes/feedback.ts` to attach the canonical `configId` when streaming user thumbs-up/down feedback to Langfuse.
- **Benchmark Experiment Run Parity**: Implement `syncLangfuseExperimentRuns` in `apps/agent/eval/observability-sync.ts` to export benchmark experiment runs and assertion metrics across prompt variants (`system-baseline`, `system-compact`, `system-fewshot`) to Langfuse Dataset Runs (`/api/public/dataset-run-items`).
- **Model Pricing Definitions**: Register token pricing for custom `omp-gateway/google-antigravity/*` models via `POST /api/public/models` in Langfuse to eliminate zero-cost reporting.
- **Direct Trace Deep-Linking in Alerts**: Update `apps/agent/src/observability/alerts.ts` to construct direct, clickable trace detail links for both Arize Phoenix (`${phoenixBaseUrl}/projects/.../traces/${traceId}`) and Langfuse Cloud (`${langfuseBaseUrl}/project/.../traces/${traceId}`) in Telegram incident notifications.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `agent-observability`: Extend distributed tracing, evaluation ingestion, and incident alerting requirements to enforce Langfuse Score Config registration, runtime score streaming, benchmark dataset run export, model token pricing registration, and dual-platform trace deep links.

## Impact

- **APIs & Ingestion**: Adds calls to Langfuse Cloud REST API endpoints (`/api/public/score-configs`, `/api/public/scores`, `/api/public/dataset-run-items`, and `/api/public/models`). All runtime streaming runs inside `c.executionCtx.waitUntil()` with timeout guards (3000ms), ensuring zero latency degradation for user-facing streaming chat.
- **Security & Credentials**: Continues strict zero-secret compliance, utilizing existing environment variables (`LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL`, `LANGFUSE_ENABLED`). No secrets in git or client logs.
- **Dependencies**: Uses native fetch and existing `@opentelemetry/otlp-transformer`; no heavy external Langfuse Node.js SDK added to Cloudflare Worker bundle.
- **Performance**: Asynchronous execution via `waitUntil()`, bounded payload sizes, and adaptive sampling (100% on issue, 15% on normal turns) preserve Cloudflare Worker CPU limits.
