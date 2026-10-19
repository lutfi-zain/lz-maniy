## Purpose

The evaluation flywheel provides an asynchronous out-of-band evaluation queue and closed-loop data curation pipeline that continuously evaluates production agent conversations with calibrated LLM judges, redacts sensitive financial PII, and ingests failure cases into golden evaluation datasets and CI regression suites.

## ADDED Requirements

### Requirement: Asynchronous Evaluation Queue
The agent backend SHALL enqueue conversational turns into a persistent evaluation queue without blocking user streaming response time or consuming user-facing Worker CPU quotas.

#### Scenario: Enqueuing high-priority flagged turns
- **WHEN** a chat turn triggers an anomaly (`score < 0.5` in deterministic code evals, response latency > 25 seconds, or explicit negative feedback thumbs-down)
- **THEN** the system immediately inserts an evaluation job into `eval_queue` with `priority = 'high'` and status `pending` within `c.executionCtx.waitUntil()`.

#### Scenario: Multi-tenant ownership verification on feedback enqueuing
- **WHEN** a user posts feedback thumbs-down to `/api/chat/feedback`
- **THEN** the system verifies that the specified `messageId` and `conversationId` strictly belong to the authenticated `user_id` before reading message content or enqueuing the turn into `eval_queue`, rejecting unverified requests with HTTP 403.

#### Scenario: Enqueuing baseline adaptive sampled turns
- **WHEN** a normal successful chat turn finishes streaming and passes deterministic code evaluators
- **THEN** the system samples the turn at a configurable rate (5% to 10%) and enqueues it with `priority = 'normal'`.

#### Scenario: Subrequest budget enforcement during scheduled queue draining
- **WHEN** the scheduled worker executes `scheduled()`
- **THEN** the batch query leases at most 5 pending jobs (`LIMIT 5`) to guarantee that total external subrequests stay strictly below Cloudflare Worker's 50-subrequest quota limit.

#### Scenario: Processing pending queue jobs via authenticated HTTP drain endpoint
- **WHEN** an authorized client invokes `POST /api/eval/drain-queue` with a valid `Authorization: Bearer <EVAL_ADMIN_KEY>`
- **THEN** the system leases up to the requested batch size (up to 25 items), transitions status to `processing`, records `locked_at`, and returns aggregate processed counts.

#### Scenario: Reaping stalled processing jobs
- **WHEN** a queue drain cycle begins
- **THEN** the system automatically resets any job with `status = 'processing'` whose `locked_at` timestamp is older than 600 seconds back to `status = 'pending'`, incrementing `attempts`.

### Requirement: Semantic LLM-as-a-Judge Evaluation
The evaluation pipeline SHALL execute calibrated model-graded evaluations against enqueued turns using a zero-temperature judge model via the OMP AI Gateway, producing structured evaluations with Chain-of-Thought reasoning.

#### Scenario: Financial soundness validation
- **WHEN** an enqueued turn contains financial advice, safe-to-spend estimations, or debt/goal calculations
- **THEN** the LLM judge verifies that the advice strictly defends locked reserves, enforces deficit warnings when upcoming commitments exceed spendable cash, maintains arithmetic consistency with provided tool payloads, and outputs a score between 0.0 and 1.0 with a detailed reasoning string.

#### Scenario: Multi-currency and tone policy compliance
- **WHEN** the LLM judge evaluates the assistant output against the Eve persona specification
- **THEN** the judge asserts zero conversational emojis, adherence to Indonesian Rupiah currency formatting (`Rp X.XXX.XXX`) for base currency, absolute absence of raw dollar signs (`$`), and tolerance for legitimate non-dollar foreign/crypto currencies (e.g. `USDT`, `EUR`, `SGD`) when explicitly referenced in user context.

#### Scenario: Non-financial turn evaluation pass-through
- **WHEN** an evaluated turn contains only UI navigation commands or generic greeting with zero financial balance data
- **THEN** the financial soundness evaluator marks the rubric as not applicable (`isApplicable: false`) and defaults to pass.

#### Scenario: Tool call trajectory and efficiency check
- **WHEN** a user turn requires data retrieval or financial mutations
- **THEN** the judge evaluates whether the agent invoked the necessary domain tools, avoided redundant queries, and correctly handled tool error payloads.

### Requirement: PII Redaction and Sanitization Guardrail
The evaluation flywheel SHALL scrub all Personally Identifiable Information (PII) and raw financial identifiers from prompts, assistant responses, and tool payloads before staging candidate examples.

#### Scenario: 4-pass multi-pattern PII sanitization
- **WHEN** user prompts, assistant outputs, or tool payloads are processed for candidate staging
- **THEN** the 4-pass PII scrubber masks auth tokens, API keys, JWTs, Indonesian NIK (16-digit), phone numbers (`+62`, `08`), contextual bank accounts, and user emails into standardized placeholders (`[REDACTED_...]`).

#### Scenario: Monetary quantity preservation
- **WHEN** payloads contain monetary amounts formatted with dots (e.g. `Rp 15.000.000`), unformatted numbers preceded by currency symbols, or billion-IDR integer amounts (e.g. `1000000000`)
- **THEN** the PII scrubber preserves these numbers without modification to allow exact arithmetic verification by downstream evaluators.

#### Scenario: Recursive tool payload sanitization
- **WHEN** a failed evaluation turn is staged into `eval_dataset_candidates`
- **THEN** the system recursively traverses `tool_results_json`, masks all bank accounts, phone numbers, and recipient names, and serializes the result into `sanitized_tool_calls_json`.

### Requirement: Production-to-Dataset Curation Flywheel
The system SHALL curate failing production traces into structured dataset candidates and synchronize them across local and remote evaluation registries.

#### Scenario: Staging failed traces as dataset candidates
- **WHEN** an evaluated turn receives an overall LLM judge score below 0.5 or explicit negative feedback thumbs-down
- **THEN** the system sanitizes the conversation with the 4-pass PII scrubber and writes a record into `eval_dataset_candidates` tagged with failure category (matching one of the 14 `EvalTestCase['category']` types), timestamp, and trace ID.

#### Scenario: Ingesting candidates into Arize Phoenix and Langfuse Datasets
- **WHEN** the dataset sync workflow executes
- **THEN** the system pushes approved candidates into Arize Phoenix dataset `maniyy-agent-production-edge-cases` and Langfuse dataset `production-failures-regression` with input/output payloads and error annotations.

#### Scenario: Exporting staged candidates to CI regression test suite
- **WHEN** an engineer runs `bun run eval:export-candidates`
- **THEN** the system serializes staged failure cases into `EvalTestCase` objects formatted for `apps/agent/eval/dataset.ts`, discarding real session/user identifiers and emitting synthetic `TC-PROD-XXX` test cases for Promptfoo CI gates.

### Requirement: Telemetry and Alerting Parity
The asynchronous evaluation system SHALL propagate judge scores and incident alerts to observability platforms with trace correlation.

#### Scenario: Publishing scores to Langfuse and Phoenix
- **WHEN** an asynchronous evaluation job completes
- **THEN** the evaluator pushes scores and reasoning to Langfuse via `POST /api/public/scores` and Arize Phoenix via span annotations linked to the original root `traceId`.

#### Scenario: Triggering Telegram alerts on critical semantic regressions
- **WHEN** an evaluated turn exhibits a severe failure (hallucinated balance or unauthorized locked cash liquidation)
- **THEN** the system dispatches an alert message to Telegram via the configured incident bot detailing the trace ID, score, failure explanation, and user message snippet.
