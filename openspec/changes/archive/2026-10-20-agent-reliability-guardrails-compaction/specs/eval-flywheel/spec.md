## MODIFIED Requirements

### Requirement: Asynchronous Evaluation Queue
The agent backend SHALL enqueue conversational turns into a persistent evaluation queue without blocking user streaming response time or consuming user-facing Worker CPU quotas, supporting trigger classifications for guardrail trips and iteration exhaustion.

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

#### Scenario: Guardrail trip enqueuing
- **WHEN** an input prompt injection attempt is blocked or an in-band numeric ungrounded output is detected
- **THEN** the turn is asynchronously enqueued with `trigger_reason` set to `'guardrail_trip'` for out-of-band analysis.

#### Scenario: Iteration exhaustion enqueuing
- **WHEN** an agent execution hits the maximum step limit or trips the loop breaker circuit
- **THEN** the turn is asynchronously enqueued with `trigger_reason` set to `'iteration_exhaustion'` for trajectory evaluation.

### Requirement: Production-to-Dataset Curation Flywheel
The system SHALL curate failing production traces into structured dataset candidates with expanded domain categories for safety and compaction retention, synchronizing them into CI regression suites.

#### Scenario: Staging failed traces as dataset candidates
- **WHEN** an evaluated turn receives an overall LLM judge score below 0.5 or explicit negative feedback thumbs-down
- **THEN** the system sanitizes the conversation with the 4-pass PII scrubber and writes a record into `eval_dataset_candidates` tagged with failure category (matching one of the 14 `EvalTestCase['category']` types), timestamp, and trace ID.

#### Scenario: Ingesting candidates into Arize Phoenix and Langfuse Datasets
- **WHEN** the dataset sync workflow executes
- **THEN** the system pushes approved candidates into Arize Phoenix dataset `maniyy-agent-production-edge-cases` and Langfuse dataset `production-failures-regression` with input/output payloads and error annotations.

#### Scenario: Exporting staged candidates to CI regression test suite
- **WHEN** an engineer runs `bun run eval:export-candidates`
- **THEN** the system serializes staged failure cases into `EvalTestCase` objects formatted for `apps/agent/eval/dataset.ts`, discarding real session/user identifiers and emitting synthetic `TC-PROD-XXX` test cases for Promptfoo CI gates.

#### Scenario: Guardrail failure classification
- **WHEN** an enqueued turn fails guardrail compliance or exhibits injection vulnerability during judge evaluation
- **THEN** the candidate is staged with domain category `'guardrail_safety'` and rubric `'guardrail_compliance'` for export to Promptfoo and Phoenix datasets.

#### Scenario: Compaction retention failure classification
- **WHEN** an enqueued turn demonstrates lost entity awareness or financial figures distorted by compaction
- **THEN** the candidate is staged with domain category `'compaction_retention'` and rubric `'context_retention'`.

## ADDED Requirements

### Requirement: Dual-Track Evaluation Rubric for Guardrail and Memory Fidelity
The asynchronous evaluation judge SHALL evaluate enqueued traces against dedicated rubrics for guardrail attack resistance and post-compaction memory fidelity in addition to financial soundness.

#### Scenario: Judge evaluates multi-turn trace post-compaction
- **WHEN** evaluating a conversation that underwent compaction
- **THEN** the judge checks whether active wallet balances and historical commitments mentioned in earlier turns remain consistent in the assistant's post-compaction advice.
