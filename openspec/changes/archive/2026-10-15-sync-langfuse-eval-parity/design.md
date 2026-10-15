## Context

See `proposal.md` for background and motivation. 

The Maniy observability architecture operates a dual-exporter pattern where Cloudflare Worker runtime traces stream concurrently to self-hosted Arize Phoenix and Langfuse Cloud over OTLP Protobuf. While traces and dataset items flow to both, Langfuse lacks the structured evaluation metadata, score configurations, experiment runs, and custom model definitions present in Phoenix.

Key constraints:
1. **Edge Worker Runtime**: `apps/agent` runs on Cloudflare Workers; subrequests must be frugal, non-blocking, and safely handled in `c.executionCtx.waitUntil()`. No heavy Node.js SDKs can be bundled.
2. **Zero Credentials in Git**: All API keys and secrets must resolve dynamically from environment variables (`LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL`).
3. **Idempotence & Graceful Degradation**: Observability sync scripts and runtime score streaming must never fail primary user request loops if an external observability collector is degraded or returns 409 / 429.

## Goals / Non-Goals

**Goals:**
- Establish 1:1 schema parity between Phoenix `annotation_configs` and Langfuse `score-configs` (8 canonical configs + user feedback).
- Stream evaluated scores from continuous production evaluation (`evaluateTurn`) directly to Langfuse Scores API (`/api/public/scores`).
- Bind user feedback ratings (thumbs up/down) to the canonical `user_feedback` score config ID.
- Materialize benchmark experiment runs (135 runs across 5 matrix suites) into Langfuse Dataset Runs (`/api/public/dataset-run-items`).
- Register custom model definitions and pricing for `omp-gateway/google-antigravity/*` models via `POST /api/public/models`.
- Provide direct, clickable trace detail links for both Phoenix and Langfuse in Telegram incident alerts.

**Non-Goals:**
- Replacing Promptfoo as the CI/CD pre-deploy quality gate.
- Modifying client-side SvelteKit UI chat bubbles (the frontend already emits 👍/👎 events).
- Building custom UI dashboards inside Maniy web app (users inspect Arize Phoenix and Langfuse Cloud directly).

## Decisions

### 1. Score Config Registry Schema & Idempotent Synchronization
In Langfuse, score configurations (`POST /api/public/score-configs`) establish strict categorical rubrics and numeric boundaries.

We define a canonical score config dictionary in `apps/agent/eval/observability-sync.ts`:
```typescript
interface LangfuseScoreConfigDef {
  name: string;
  dataType: 'CATEGORICAL' | 'NUMERIC' | 'BOOLEAN';
  description: string;
  categories?: Array<{ label: string; value: number }>;
  minValue?: number;
  maxValue?: number;
}
```
The synchronization runner queries existing configs via `GET /api/public/score-configs?limit=100`, creates missing entries via `POST /api/public/score-configs`, and returns a dictionary of `name -> configId` for downstream binding.

### 2. Runtime Score Ingestion in Worker `waitUntil()`
In `apps/agent/src/routes/chat.ts`, continuous evaluation currently executes in `c.executionCtx.waitUntil()`. We extend this pipeline:
```
+-------------------------------------------------------------------------+
|                  CONTINUOUS EVALUATION RUNTIME PIPELINE                 |
+-------------------------------------------------------------------------+
|                                                                         |
|  [Stream Finished]                                                      |
|         │                                                               |
|         ▼                                                               |
|  [evaluateTurn(prompt, output, tools)]                                  |
|         │                                                               |
|         ├─────────────────────────────────────────┐                     |
|         ▼                                         ▼                     |
|  [Root Span Attributes]                 [streamScoresToLangfuse()]      |
|  - eval.numeric_grounding.score         - POST /api/public/scores       |
|  - eval.currency_governance.score       - name, value, comment, traceId |
|  - eval.locked_cash_guard.score         - Non-blocking (3s timeout)     |
|         │                                                               |
|         ▼                                                               |
|  [Phoenix OTLP Exporter]                                                |
|                                                                         |
+-------------------------------------------------------------------------+
```
A helper `streamScoresToLangfuse(env, scores, traceId, sessionId)` iterates through evaluated items, posting each score payload. Failures are caught with `console.warn` without throwing.

### 3. User Feedback Config ID Attachment
In `apps/agent/src/routes/feedback.ts`, `streamToLangfuse` currently sends:
```json
{
  "name": "user_feedback",
  "value": 1.0,
  "comment": "user reason",
  "traceId": "...",
  "sessionId": "...",
  "dataType": "NUMERIC"
}
```
We update this to use `dataType: "CATEGORICAL"`, mapping `1.0 -> positive` and `0.0 -> negative`, and optionally attaching `configId` if resolved or configured in worker environment.

### 4. Materializing Benchmark Matrix Runs in Langfuse
Phoenix suite currently inserts 135 runs into PostgreSQL tables (`experiments`, `experiment_runs`, `experiment_run_annotations`).
In `apps/agent/eval/observability-sync.ts`, we add `syncLangfuseExperimentRuns`:
- Uses `POST /api/public/dataset-run-items` for each test case run.
- Attaches run name (`exp-baseline-gemini-3.8-flash`, etc.).
- Attaches assertion scores (`financial_grounding_judge`, `tool_dispatch_accuracy`, `idr_currency_compliance`) linked to the golden dataset item.

### 5. Custom Model Pricing Registration
We register custom models in Langfuse via `POST /api/public/models`:
- `google-antigravity/gemini-3.8-flash`: Input $0.15 / Mtok, Output $0.60 / Mtok.
- `google-antigravity/gemini-3.5-flash-lite`: Input $0.075 / Mtok, Output $0.30 / Mtok.
- `google-antigravity/gemini-3.1-flash-lite`: Input $0.075 / Mtok, Output $0.30 / Mtok.
- `google-antigravity/gemini-2.5-flash-lite`: Input $0.075 / Mtok, Output $0.30 / Mtok.
This enables accurate cost calculation in the Langfuse dashboard.

### 6. Direct Deep-Linking in Telegram Incident Alerts
In `apps/agent/src/observability/alerts.ts`, we update link generation:
- Phoenix: `${phoenixBaseUrl}/projects/maniyy-agent-evals/traces/${traceId}`
- Langfuse: `${langfuseBaseUrl}/project/default/traces/${traceId}` (or project slug if configured).
This allows on-call engineers to jump directly to the exact failing turn from Telegram.

## Risks / Trade-offs

- **Subrequest Limits in Cloudflare Workers**: Free/paid workers have subrequest limits per request (50 on Free, 1000 on Standard). Sending 4 scores individually could use 4 subrequests.
  *Mitigation*: Adaptive continuous evaluation only runs on 15% of passing turns and 100% of anomalies. We also batch scores into a single `Promise.allSettled()` with a strict 3000ms AbortController timeout.
- **Network Latency / Unreachable Langfuse**:
  *Mitigation*: Runtime streaming is strictly detached via `c.executionCtx.waitUntil()`. A slow Langfuse API call will never delay the HTTP response stream to the user.
- **Score Config Name Drift**:
  *Mitigation*: The canonical 8 config names in `observability-sync.ts` strictly mirror the Phoenix `annotation_configs` constants in `apps/agent/eval/phoenix-suite.ts`.

## Test Strategy

1. **Unit Tests (Vitest)**:
   - `apps/agent/src/__tests__/unit/observability-sync.test.ts`: Test `syncLangfuseScoreConfigs`, `syncLangfuseExperimentRuns`, and `syncLangfuseModelPricing` with mocked fetch responses (testing create, skip existing, error handling).
   - `apps/agent/src/__tests__/unit/feedback.test.ts`: Verify `streamToLangfuse` sends proper payload with categorical value and config binding.
   - `apps/agent/src/__tests__/unit/alerts.test.ts`: Verify Telegram alert generation includes trace deep links when `phoenixTraceId` is provided.
2. **Integration Verification**:
   - Run `bun run check:agent` (TypeScript type check).
   - Execute dry-run / live test of `bun apps/agent/eval/observability-sync.ts` verifying all score configs and models are created in Langfuse Cloud.
