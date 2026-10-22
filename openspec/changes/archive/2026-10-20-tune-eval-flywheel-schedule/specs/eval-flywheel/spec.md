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
- **WHEN** the scheduled worker executes `scheduled()` on the 2-day cadence (`0 23 */2 * *` / 06:00 WIB)
- **THEN** the batch query leases at most 7 pending jobs (`LIMIT 7`) to maximize backlog clearance while guaranteeing that total external subrequests stay strictly below Cloudflare Worker's 50-subrequest quota limit ($7 \times 6 = 42 \le 50$).

#### Scenario: Zero-cost fast exit on empty scheduled queue
- **WHEN** the scheduled worker executes `scheduled()` and zero pending jobs exist in `eval_queue`
- **THEN** the drain routine returns immediately with zero processed jobs without dispatching requests to external LLM gateways, Langfuse, Phoenix, or Telegram.

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
