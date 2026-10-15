# agent-observability Delta Specification

## ADDED Requirements

### Requirement: Langfuse Canonical Score Configurations Registration
The observability synchronization suite SHALL register canonical Score Configurations in Langfuse Cloud via `POST /api/public/score-configs`, establishing 1:1 schema parity with Arize Phoenix `annotation_configs`.

#### Scenario: Registering Categorical and Numeric Score Schemas
- **WHEN** `bun run sync:observability` executes with Langfuse credentials configured
- **THEN** the synchronization runner SHALL create or verify the existence of 8 score configs:
  - `financial_grounding_judge`: CATEGORICAL with values `[{"label": "grounded", "value": 1.0}, {"label": "hallucinated", "value": 0.0}]`
  - `advisory_rubric_judge`: CATEGORICAL with values `[{"label": "excellent", "value": 1.0}, {"label": "acceptable", "value": 0.75}, {"label": "poor", "value": 0.0}]`
  - `multi_intent_completeness`: CATEGORICAL with values `[{"label": "complete", "value": 1.0}, {"label": "partial", "value": 0.5}, {"label": "incomplete", "value": 0.0}]`
  - `idr_currency_compliance`: CATEGORICAL with values `[{"label": "compliant", "value": 1.0}, {"label": "violation", "value": 0.0}]`
  - `tool_dispatch_accuracy`: CATEGORICAL with values `[{"label": "pass", "value": 1.0}, {"label": "fail", "value": 0.0}]`
  - `credit_settlement_audit`: CATEGORICAL with values `[{"label": "audited", "value": 1.0}, {"label": "unsettled", "value": 0.0}]`
  - `human_audit_review`: CATEGORICAL with values `[{"label": "approved", "value": 1.0}, {"label": "needs_revision", "value": 0.0}]`
  - `user_feedback`: CATEGORICAL with values `[{"label": "positive", "value": 1.0}, {"label": "negative", "value": 0.0}]`
  - `latency_ms`: NUMERIC with `minValue: 0` and `maxValue: 60000`
- **AND** the registration SHALL be idempotent, handling existing configs without failing.

### Requirement: Runtime Continuous Evaluation Score Streaming to Langfuse
The agent execution backend SHALL stream evaluated turn scores from continuous post-production evaluators (`evalNumericGrounding`, `evalCurrencyGovernance`, `evalNoEmoji`, `evalLockedCashGuard`) to the Langfuse Scores API (`POST /api/public/scores`).

#### Scenario: Streaming Evaluated Turn Scores to Langfuse Scores API
- **WHEN** a conversational turn undergoes continuous evaluation in `c.executionCtx.waitUntil()`
- **THEN** each evaluation result SHALL be posted to Langfuse `/api/public/scores` attached to `traceId` and `sessionId` with the corresponding `name`, `value`, `comment` (explanation), and `dataType`
- **AND** the score submission SHALL execute asynchronously without throwing errors if Langfuse is temporarily unreachable.

### Requirement: Custom Model Token Pricing Registration in Langfuse
The observability synchronization suite SHALL register custom model pricing for OMP AI Gateway models (`omp-gateway/google-antigravity/*`) in Langfuse via `POST /api/public/models`.

#### Scenario: Synchronizing Custom Gemini Antigravity Pricing
- **WHEN** the synchronization runner executes with Langfuse credentials configured
- **THEN** model entries for `google-antigravity/gemini-3.8-flash`, `google-antigravity/gemini-3.5-flash-lite`, `google-antigravity/gemini-3.1-flash-lite`, and `google-antigravity/gemini-2.5-flash-lite` SHALL be created or updated with input and output token unit prices
- **AND** subsequent traces ingested by Langfuse matching these model names SHALL compute non-zero estimated token costs.

## MODIFIED Requirements

### Requirement: Dual-Reporting for Evaluation and Benchmark Runs
The evaluation benchmark pipeline SHALL export evaluation results, assertion scores, and token metrics to both Arize Phoenix Experiments and Langfuse Dataset Runs.

#### Scenario: Concurrent Benchmark Execution Recording
- **WHEN** Promptfoo or evaluation suites execute test cases against agent model providers
- **THEN** evaluation outputs and scores SHALL be linked to the respective dataset item
- **AND** results SHALL be visible side-by-side in both Arize Phoenix Experiments and Langfuse Dataset Runs.

#### Scenario: Materializing Prompt Variant Experiment Runs in Langfuse
- **WHEN** `bun run sync:observability` or the benchmark matrix runner executes
- **THEN** 135 benchmark runs across 5 matrix experiments (`baseline`, `compact`, `fewshot`, `multiturn`, and `judge-calibration`) SHALL be exported to Langfuse Dataset Runs (`POST /api/public/dataset-run-items`) linked to `maniyy-agent-golden-dataset` items
- **AND** all corresponding assertion scores (`financial_grounding_judge`, `tool_dispatch_accuracy`, `idr_currency_compliance`) SHALL be attached to the respective dataset run items.

### Requirement: Real-Time User Feedback Ingestion
The application SHALL ingest explicit user feedback (thumbs up/down) from the chat interface and stream corresponding scores to Phoenix Annotations and Langfuse Scores.

#### Scenario: Positive Feedback Ingestion
- **WHEN** a user clicks 👍 on an assistant message
- **THEN** the backend SHALL record a score of `1.0` in Langfuse Scores with `name: "user_feedback"`, `dataType: "CATEGORICAL"`, and bound to the `user_feedback` score config ID, alongside Phoenix `project_session_annotations` / `trace_annotations`.

#### Scenario: Negative Feedback Ingestion & Alert Dispatch
- **WHEN** a user clicks 👎 on an assistant message
- **THEN** the backend SHALL record a score of `0.0` in Langfuse and Phoenix with `name: "user_feedback"` bound to the `user_feedback` score config ID, and trigger an incident alert to Telegram.

### Requirement: Telegram Incident Alert Webhook Hook
The observability framework SHALL transmit structured incident alerts to Telegram via `@developer_ai_guweh_bot` on critical anomalies.

#### Scenario: Telegram Notification on Negative Signal
- **WHEN** a user submits negative feedback, faithfulness falls below 0.6, or latency exceeds 25 seconds
- **THEN** an alert card SHALL be dispatched to the designated Telegram chat containing session ID, user prompt, and direct deep links to both Arize Phoenix (`${phoenixBaseUrl}/projects/.../traces/${traceId}`) and Langfuse Cloud (`${langfuseBaseUrl}/project/.../traces/${traceId}`) trace detail views.
