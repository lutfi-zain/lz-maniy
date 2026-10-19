## Context

See `proposal.md` for motivation.

The Maniyy agent runtime runs on Cloudflare Workers using Hono and Vercel AI SDK. Responses are streamed via Server-Sent Events (SSE). Currently, in `apps/agent/src/routes/chat.ts`, `evaluateTurn()` runs synchronous Level 0 code evaluators (`evalNumericGrounding`, `evalCurrencyGovernance`, `evalNoEmoji`) inside `c.executionCtx.waitUntil()`. True semantic LLM evaluation (`eval/grader.ts`) is only executed offline via Promptfoo because executing a secondary LLM judge in `waitUntil()` risks Worker subrequest limits, CPU throttling, and latency overhead.

User feedback (thumbs up/down) in `apps/agent/src/routes/feedback.ts` pushes scores to Langfuse and Arize Phoenix annotations, but failed turns never feed back into dataset curation or CI regression suites.

## Goals / Non-Goals

**Goals:**
- Provide a decoupled, asynchronous LLM-as-a-Judge pipeline using a D1 SQLite queue (`eval_queue`) with a Dual-Trigger draining pattern (Cloudflare Worker `scheduled()` cron intervals and an authenticated high-throughput HTTP endpoint).
- Implement enterprise-grade semantic evaluators (Financial Soundness, Tone & Format Compliance, Tool Trajectory) powered by zero-temperature model grading via OMP AI Gateway.
- Implement a 4-Pass Deterministic PII Scrubber that preserves currency math numbers (including billion-IDR figures) while redacting credentials, NIK, phone numbers, and bank accounts.
- Implement an automated Production-to-Dataset Flywheel that stages failed traces into `eval_dataset_candidates` aligned with the 14 domain categories in `apps/agent/eval/dataset.ts`.
- Synchronize staged candidates to Arize Phoenix Datasets (`maniyy-agent-production-edge-cases`), Langfuse Datasets (`production-failures-regression`), and local `apps/agent/eval/dataset.ts` for CI regression gating.

**Non-Goals:**
- Running synchronous LLM judge calls in the live SSE streaming response path.
- Requiring paid Cloudflare Queues bindings (D1 provides universal portability across local `wrangler dev` and production).
- Automated git commits or deployment rollbacks triggered automatically by judge scores.

## Architecture & Data Flow

```
+---------------------------------------------------------------------------------------+
|                               ASYNC EVAL & FLYWHEEL ARCHITECTURE                      |
+---------------------------------------------------------------------------------------+
|                                                                                       |
|   1. REAL-TIME CHAT PATH (Zero Added Latency)                                         |
|                                                                                       |
|   User Chat ---> [POST /api/chat] ---> Stream Response (SSE) to User                  |
|                        |                                                              |
|                        v (c.executionCtx.waitUntil)                                   |
|               [L0 Code Evaluators] -> Stream preliminary scores to Langfuse           |
|                        |                                                              |
|                        v (Sampling filter: 100% on error/flag, 10% normal)            |
|               [Enqueue Job to D1 eval_queue (status: 'pending')]                      |
|                                                                                       |
|   ---------------------------------------------------------------------------------   |
|   2. ASYNC EVALUATOR PATH (Dual-Trigger Architecture)                                 |
|                                                                                       |
|   [Trigger A: Worker Cron]                  [Trigger B: VPS / CI / Manual]           |
|   [crons: */5 * * * *]                      POST /api/eval/drain-queue               |
|   (Batch size: 5-6 items)                   (Bearer EVAL_ADMIN_KEY, batch: <=25)     |
|            |                                             |                            |
|            +-----------------------+---------------------+                            |
|                                    v                                                  |
|                   [drainEvalQueue(env, { batchSize })]                               |
|                                    |                                                  |
|                                    v Transactional lease (status: 'processing')       |
|                             [Consolidated LLM Judge]                                  |
|                             (OMP AI Gateway: gemini-3.8-flash, temp: 0.0)             |
|                             - Financial Soundness (Spendable vs Locked Cash, Deficit) |
|                             - Tone & Currency Governance (No $, No Emojis, Rp format) |
|                             - Tool Trajectory & Efficiency                            |
|                                    |                                                  |
|                     +--------------+--------------+                                   |
|                     v                             v                                   |
|           [Scores to Langfuse & Phoenix] [Failure Detected? (score < 0.5 / thumbs-down)|
|           (traceId / spanId correlation)          |                                   |
|                                                   v                                   |
|   ---------------------------------------------------------------------------------   |
|   3. CLOSED-LOOP DATASET FLYWHEEL                                                     |
|                                                                                       |
|                                     [4-Pass Deterministic PII Scrubber]               |
|                                     - Pass 1: Tokens, API Keys, JWTs                  |
|                                     - Pass 2: NIK (16-digit) & Phone Numbers          |
|                                     - Pass 3: Contextual Bank Accounts (Keep Rp Math) |
|                                     - Pass 4: Emails & Session User Identity          |
|                                                   |                                   |
|                                                   v                                   |
|                                     [D1 eval_dataset_candidates]                      |
|                                     (Taxonomy: 14 EvalTestCase categories)            |
|                                                   |                                   |
|                                  +----------------+--------------------+              |
|                                  v                                     v              |
|                      [Remote Registry Sync]                 [Local CI Sync]           |
|                      - Arize Phoenix Dataset                bun run                   |
|                      - Langfuse Dataset API                 eval:export-candidates    |
|                                                                    |                  |
|                                                                    v                  |
|                                                            [eval/dataset.ts]          |
|                                                            (Promptfoo CI Gate)        |
|                                                                                       |
+---------------------------------------------------------------------------------------+
```

## Decisions

### 1. Decoupled D1 Queue State Machine with Leased Expiration
- **Rationale**: D1 is already integrated into the monorepo for users, conversations, and credits. A SQLite-backed job queue (`eval_queue`) provides transactional leasing (`status: 'pending'` -> `'processing'` -> `'completed'`), priority ordering (`high` for thumbs-down, `normal` for sampled turns), zero external dependencies, and seamless local testing with `wrangler dev`.
- **Stale Job Reaping**: To prevent stalled jobs if a Worker times out or is killed mid-execution, leased jobs include `locked_at INTEGER`. Any job in `processing` for >10 minutes is automatically reaped back to `pending`.

### 2. Stratified Adaptive Sampling Strategy
- **Sampling Matrix**:
  - `100%` sampling for: User thumbs-down feedback, Level 0 code eval failures (`score < 0.5`), Turn latency > 25,000ms, or Model fallback recovery activations.
  - `5–10%` uniform random sampling for normal successful turns.
- **Cost & Quota Protection**: Queue processor enforces batch size limits and automatically drops expired jobs older than 48 hours.

### 3. Consolidated LLM-as-a-Judge Prompt Architecture
- **Judge Model**: `google-antigravity/gemini-3.8-flash` via OMP AI Gateway (`https://ai.membran.app/v1/chat/completions`) with fallback to `gemini-3.7-flash`.
- **Invariants**: Temperature `0.0`, strict JSON schema response format evaluating all 3 criteria in **a single gateway call** (reducing subrequests from 3 to 1):
  ```json
  {
    "evaluator": "consolidated_judge",
    "overallScore": 1.0,
    "pass": true,
    "reasoning": "Step-by-step chain of thought...",
    "financialSoundness": {
      "score": 1.0,
      "lockedCashDefended": true,
      "deficitHandled": true,
      "arithmeticConsistent": true,
      "isApplicable": true
    },
    "personaTone": {
      "score": 1.0,
      "zeroEmojis": true,
      "currencyCompliant": true,
      "explanation": "..."
    },
    "toolTrajectory": {
      "score": 1.0,
      "toolSelectionAccurate": true,
      "redundantCallsAvoided": true,
      "explanation": "..."
    }
  }
  ```
- **Category-Specific Invariants**:
  - `multi_currency`: Non-dollar currencies (e.g. `115.61 USDT`, `EUR`, `SGD`) are valid and MUST NOT be forced into `Rp` or flagged as errors. Raw dollar sign `$` remains strictly banned.
  - `safe_to_spend`: Deficit safe-to-spend (spendable cash < upcoming planned obligations) MUST trigger a warning and forbid discretionary spending.
  - `planning_projection`: Forward mathematical projections are evaluated for calculation logic rather than raw string matching against tool outputs.
  - `ui_control` / non-financial turns: If no financial balance is discussed, `financialSoundness.isApplicable` is `false`, defaulting to pass.

### 4. Deterministic Multi-Pass PII Scrubber Specification
To prevent corrupting numeric values needed for arithmetic verification (e.g. `Rp 1.000.000.000` = 1 Milyar IDR, or Unix millisecond timestamps `1729324800000`), the scrubber runs in 4 isolated passes:
1. **Pass 1: Secret & Credential Redaction**:
   - Bearer tokens: `/Bearer\s+[A-Za-z0-9._~+/=-]+/gi` -> `Bearer [REDACTED_TOKEN]`
   - API keys: `/\b(?:rd_live_|fp_live_|gsk_|AIza|phx_adm_sec_|sk-lf-|pk-lf-|sk-ant-|sk-proj-)[A-Za-z0-9_-]+/g` -> `[REDACTED_API_KEY]`
   - Standard JWTs: `/\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g` -> `[REDACTED_JWT]`
2. **Pass 2: Indonesian National ID (NIK) & Phone Numbers**:
   - Indonesian NIK (16 digits starting with 1-9): `/\b[1-9]\d{15}\b/g` -> `[REDACTED_NIK]`
   - Indonesian Phone Numbers: `/(?:\+62[\s.-]?|62[\s.-]?|0)8[1-9][0-9\s.-]{7,12}\b/g` -> `[REDACTED_PHONE]`
3. **Pass 3: Bank Account Numbers with Disambiguation**:
   - Contextual Bank Accounts: `/(?<=(?:bca|mandiri|bri|bni|jago|permata|seabank|rek(?:ening)?|norek)\s*[:#.-]?\s*)\b\d{9,16}\b/gi` -> `[REDACTED_ACCOUNT]`
   - Generic numbers are ONLY redacted if they do NOT have thousand dots (`.`), are NOT preceded by currency prefixes (`Rp`, `IDR`, `USDT`), and are NOT Unix timestamps (starting with 16 or 17 of length 13):
     `/(?<!(?:Rp\.?|IDR|\$)\s*)(?<!\.)\b(?!(?:16|17)\d{11}\b)\d{10,16}\b(?!\.)/g` -> `[REDACTED_ACCOUNT]`
4. **Pass 4: Emails & Session User Identity**:
   - Emails: `/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g` -> `[REDACTED_EMAIL]`
   - Session Identity: User names and personal IDs from auth metadata -> `[USER_NAME]`.

### 5. Dual-Trigger Queue Draining Strategy & Subrequest Quota Defense
- **Subrequest Budgeting on Cloudflare Workers**:
  - Cloudflare Free Tier imposes a hard cap of 50 subrequests per invocation.
  - Each evaluated job consumes: 1 Gateway LLM Judge call + 1 Langfuse score call + 1 Phoenix annotation call (+ 1 optional Telegram alert if failed) = 3 to 4 subrequests.
- **Trigger A (Worker Cron Baseline)**: Runs every 5 minutes in `apps/agent/src/index.ts:scheduled()`. Hard-capped at `batchSize = 5` items ($5 \times 4 = 20 \ll 50$ subrequests), ensuring completely safe serverless operation.
- **Trigger B (Authenticated HTTP Drain Route)**: `POST /api/eval/drain-queue` in `apps/agent/src/routes/eval.ts` guarded by `Authorization: Bearer <EVAL_ADMIN_KEY>`. Allows `batchSize` up to 25 items for execution from VPS systemd timers, GitHub Actions CI workflows, or manual admin triggers.

### 6. Taxonomy-Aligned Dataset Flywheel
- Staged candidate categories strictly conform to the 14 `EvalTestCase['category']` types defined in `apps/agent/eval/dataset.ts` (`balance_query`, `planning_projection`, `financial_sanity`, `safe_to_spend`, `multi_currency`, etc.).
- When `bun run eval:export-candidates` is run, candidates are emitted with synthetic identifiers (`TC-PROD-XXX`) without personal user IDs or session trace secrets, allowing direct inclusion in git-versioned Promptfoo regression suites.

## Database Schema (D1 Migrations)

```sql
-- Migration 0006_eval_flywheel.sql

CREATE TABLE IF NOT EXISTS eval_queue (
  id TEXT PRIMARY KEY,
  trace_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal', -- 'high' | 'normal'
  status TEXT NOT NULL DEFAULT 'pending',   -- 'pending' | 'processing' | 'completed' | 'failed'
  user_message TEXT NOT NULL,
  assistant_output TEXT NOT NULL,
  tool_results_json TEXT,
  trigger_reason TEXT NOT NULL,             -- 'negative_feedback' | 'code_eval_failure' | 'sla_breach' | 'random_sample'
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  locked_at INTEGER,                        -- Epoch timestamp when leased to handle worker timeout reaping
  created_at INTEGER NOT NULL,
  processed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_eval_queue_status_prio ON eval_queue(status, priority, created_at);

CREATE TABLE IF NOT EXISTS eval_dataset_candidates (
  id TEXT PRIMARY KEY,
  source_trace_id TEXT NOT NULL,
  source_session_id TEXT NOT NULL,
  evaluator_rubric TEXT NOT NULL,          -- 'financial_soundness' | 'persona_tone_compliance' | 'tool_trajectory'
  domain_category TEXT NOT NULL,           -- Must match one of 14 EvalTestCase categories (e.g. 'financial_sanity')
  sanitized_prompt TEXT NOT NULL,
  sanitized_output TEXT NOT NULL,
  sanitized_tool_calls_json TEXT,          -- PII-scrubbed tool payload
  judge_score REAL NOT NULL,
  judge_reasoning TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'staged',   -- 'staged' | 'synced_remote' | 'exported_ci' | 'rejected'
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_eval_candidates_status ON eval_dataset_candidates(status, created_at);
```

## Risks / Trade-offs

- **Subrequest Exhaustion**: Mitigated by strict `batchSize = 5` cap on Worker cron and consolidated single-call LLM judge requests.
- **PII Math Redaction Collisions**: Mitigated by 4-pass contextual disambiguation ensuring currency prefixes and dot-separated amounts are preserved.
- **Worker Timeouts on Cron**: Mitigated by `locked_at` timestamp leasing and automatic stale job reaping (>10 minutes).

## Test Strategy

- **Unit Tests (`apps/agent/src/__tests__/unit/`)**:
  - `eval-queue.test.ts`: Job enqueuing, priority leasing, max attempts retry, and stale job reaping.
  - `pii-scrubber.test.ts`: Phone numbers, bank accounts, emails, billion-IDR amounts, and timestamps.
  - `async-judge.test.ts`: Consolidated judge parsing, multi-currency non-dollar validation, and deficit safe-to-spend.
- **Integration Tests**:
  - Worker cron invocation draining 5 jobs with mock gateway and asserting subrequests remain < 25.
  - `POST /api/eval/drain-queue` authentication guard with valid/invalid `EVAL_ADMIN_KEY`.
  - Exporter test asserting staged records convert to valid `EvalTestCase` types in `dataset.ts`.
