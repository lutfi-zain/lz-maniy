## Why

Currently, the Maniyy financial agent (`apps/agent`) relies solely on synchronous Level 0 deterministic code evaluators (`evalNumericGrounding`, `evalCurrencyGovernance`, `evalNoEmoji`) and pseudo-checks in edge response lifecycles (`c.executionCtx.waitUntil`). True semantic evaluations (Financial Advice Soundness, Multi-Turn Goal Completion, Tone Adherence) are restricted to offline Promptfoo CI runs because invoking a second LLM judge inside Cloudflare Workers during real-time streaming risks breaching subrequest limits, CPU quotas, and latency budgets.

Furthermore, production evaluation is an open loop: when a user gives thumbs-down feedback or an anomaly is detected, an alert is dispatched to Telegram and a score is pushed to Langfuse, but the failure terminates there. There is no automated mechanism to scrub PII, categorize the edge case, and ingest the failing trace back into golden evaluation datasets (Arize Phoenix and Langfuse) or generate regression test cases for CI.

Implementing an Asynchronous LLM-as-a-Judge pipeline with an automated Production-to-Dataset Flywheel closes this loop following modern enterprise LLMOps best practices, guaranteeing continuous quality governance and zero silent regressions without degrading edge user experience.

## What Changes

- **Asynchronous LLM-as-a-Judge Architecture**: Decouple semantic LLM evaluations from user chat streaming using a resilient D1-backed evaluation queue (`eval_queue`) and a Cloudflare Worker `scheduled()` cron handler (or on-demand draining API).
- **Stratified & Adaptive Sampling**: 100% evaluation for user-flagged turns (negative feedback thumbs-down, deterministic code eval failures, latency SLA breaches >25s) and 5–10% baseline random sampling for normal turns.
- **Enterprise LLM-as-a-Judge Rubrics**: Implement structured Chain-of-Thought (CoT) evaluation prompts with temperature 0.0 against OMP AI Gateway (Google Gemini 3.8 Flash / Claude 3.5 Haiku) covering:
  - `financial_soundness`: Verifies calculations, safe-to-spend logic, and debt/budget recommendation sanity.
  - `persona_tone_compliance`: Enforces strict minimalist tone, zero conversational emojis, and adherence to Eve persona.
  - `tool_efficiency_trajectory`: Validates that tools were invoked correctly without redundant queries or hallucinated parameters.
- **Automated Production-to-Dataset Flywheel**:
  - Deterministic PII Scrubber: Strips account numbers, phone numbers, real user names, and exact timestamps from user prompts and tool payloads before dataset staging.
  - Failure Ingestion Pipeline: Automatically stages failed traces (`score < 0.5` or negative user feedback) into a D1 curation table (`eval_dataset_candidates`).
  - LLMOps Registry Sync: Pushes curated candidates to Arize Phoenix Datasets (`maniyy-agent-production-edge-cases`) and Langfuse Datasets (`production-failures-regression`) via API.
  - CI Regression Export: Provides a deterministic CLI command (`bun run eval:export-candidates`) that formats staged failures directly into `apps/agent/eval/dataset.ts` for immediate Promptfoo regression gate coverage.
- **Dual-Platform Telemetry Synchronization**: Stream async judge scores and explanations back to Phoenix Span Annotations (`/v1/span-annotations`) and Langfuse Scores API (`/api/public/scores`) correlated by `traceId` and `sessionId`.

### Scope Boundaries

- **In-Scope**:
  - Cloudflare D1 migrations for `eval_queue` and `eval_dataset_candidates`.
  - Queue enqueueing hooks in `apps/agent/src/routes/chat.ts` and `apps/agent/src/routes/feedback.ts`.
  - Scheduled worker handler `scheduled()` in `apps/agent/src/index.ts` and cron trigger in `wrangler.toml`.
  - Core async evaluator logic (`evalAsyncJudge`, rubrics, PII scrubber).
  - CLI sync script for pushing dataset candidates to Phoenix, Langfuse, and local `dataset.ts`.
  - Unit and integration tests for queue state transitions, PII scrubbing, and evaluator schema parsing.
- **Non-Goals**:
  - Cloudflare Queues paid broker binding (D1 queue state machine provides universal zero-dependency compatibility across local dev and production).
  - Automated deployment rollback triggers based on judge scores (alerts remain informational via Telegram).
  - Redesigning the frontend chat UI (feedback thumbs up/down contract remains unchanged).

## Capabilities

### New Capabilities
- `eval-flywheel`: Implements the decoupled asynchronous LLM-as-a-judge evaluation queue, PII-scrubbed candidate extraction, and closed-loop dataset flywheel syncing production failures into Arize Phoenix, Langfuse, and local regression suites.

### Modified Capabilities
- `agent-observability`: Extends runtime evaluation requirements from in-band synchronous code evaluators to include decoupled asynchronous LLM judge execution, continuous score streaming, and automated dataset candidate generation.

## Impact

- **Worker Performance & Edge Latency**: Zero impact on user response latency; evaluations execute entirely out-of-band via background cron intervals.
- **Database (D1)**: Two new tables (`eval_queue` and `eval_dataset_candidates`) with automated retention cleanup to prevent table bloat.
- **Configuration (`wrangler.toml`)**: Add cron trigger configuration (`[triggers] crons = ["*/5 * * * *"]`) and optional drain route token.
- **External Dependencies**: Uses existing `@opentelemetry/api`, Hono, and OMP AI Gateway HTTP endpoints. No new runtime dependencies.
