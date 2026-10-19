## 1. Database Schema & Migrations

- [x] 1.1 Create D1 database migration `apps/agent/db/migrations/0006_eval_flywheel.sql` defining `eval_queue` (with `locked_at INTEGER`) and `eval_dataset_candidates` (with `evaluator_rubric`, `domain_category` constrained to the 14 canonical categories, and `sanitized_tool_calls_json`)
- [x] 1.2 Implement typed D1 query helpers in `apps/agent/src/db/queries.ts` for enqueuing jobs, leasing pending batches with priority ordering, updating job status, and staging candidates
- [x] 1.3 Implement `reapStaleProcessingJobs()` query helper in `apps/agent/src/db/queries.ts` to release jobs stuck in `status = 'processing'` for longer than 600 seconds back to `status = 'pending'`
- [x] 1.4 Add unit tests in `apps/agent/src/__tests__/unit/queries.test.ts` validating transactional leasing, status transitions, stale job reaping, and candidate staging queries

## 2. 4-Pass PII Scrubber & Sanitization Core
- [x] 2.1 Implement deterministic 4-pass PII scrubber in `apps/agent/src/observability/pii-scrubber.ts` (Pass 1: tokens/keys/JWTs; Pass 2: NIK & phone numbers; Pass 3: contextual bank accounts preserving billion-IDR amounts and timestamps; Pass 4: emails and user identity)
- [x] 2.2 Add unit test suite in `apps/agent/src/__tests__/unit/pii-scrubber.test.ts` testing phone numbers, account digits, emails, billion-IDR integer amounts, Unix timestamps, and edge cases with exact regex assertions

## 3. Consolidated Semantic LLM-as-a-Judge Engine

- [x] 3.1 Implement consolidated asynchronous judge module in `apps/agent/src/observability/async-judge.ts` with zero-temperature OMP AI Gateway invocation, single-call prompt, and Zod schema validation for `financial_soundness` (deficit safe-to-spend, locked cash defense), `persona_tone_compliance` (zero emojis, Rp format, multi-currency non-dollar tolerance), and `tool_trajectory`
- [x] 3.2 Add unit tests in `apps/agent/src/__tests__/unit/async-judge.test.ts` testing consolidated rubric prompt formatting, JSON response parsing, multi-currency non-dollar acceptance, and fallback handling on gateway errors

## 4. Edge Enqueueing Integration & Tenant Security

- [x] 4.1 Update `apps/agent/src/routes/chat.ts` to enqueue flagged turns (L0 eval failure, latency breach >25s) with `priority = 'high'` and normal turns with 5-10% stratified sampling into `eval_queue` within `c.executionCtx.waitUntil()`
- [x] 4.2 Update `apps/agent/src/routes/feedback.ts` to enqueue turns receiving thumbs-down feedback as high-priority evaluation jobs, strictly verifying user ownership (`WHERE m.id = ? AND c.user_id = ?`) before reading message content
- [x] 4.3 Add unit tests in `apps/agent/src/__tests__/unit/chat-eval-scores.test.ts` verifying that enqueuing occurs without blocking stream completion and rejects cross-tenant feedback attempts

## 5. Dual-Trigger Scheduled Worker & Queue Draining

- [x] 5.1 Configure cron trigger in `apps/agent/wrangler.toml` (`[triggers] crons = ["*/5 * * * *"]`) and implement `scheduled()` export in `apps/agent/src/index.ts` to lease and process pending batches with a hard cap of 5 items per execution to respect the 50-subrequest quota
- [x] 5.2 Implement dedicated evaluation router in `apps/agent/src/routes/eval.ts` mounted at `/api/eval`, exporting reusable `drainEvalQueue(env: Env, options?: { batchSize?: number })` and handling `POST /api/eval/drain-queue` guarded by `Authorization: Bearer <EVAL_ADMIN_KEY>`
- [x] 5.3 Dispatch judge scores to Langfuse (`POST /api/public/scores`) and Arize Phoenix span annotations, triggering Telegram alerts on severe failures (`overallScore < 0.5`)

## 6. Closed-Loop Dataset Flywheel & Sync Script

- [x] 6.1 Implement flywheel candidate pipeline in `apps/agent/src/observability/flywheel.ts` that scrubs PII from failed traces and stages them into `eval_dataset_candidates` aligned with the 14 canonical `EvalTestCase['category']` types
- [x] 6.2 Create CLI sync utility `apps/agent/eval/flywheel-sync.ts` with `bun run eval:export-candidates` script in `package.json` to serialize staged candidates directly into `apps/agent/eval/dataset.ts` with synthetic `TC-PROD-XXX` identifiers (stripping session and user IDs)
- [x] 6.3 Implement remote dataset push in `eval/flywheel-sync.ts` syncing staged candidates into Arize Phoenix dataset `maniyy-agent-production-edge-cases` and Langfuse dataset `production-failures-regression`

## 7. Full Verification & Secret Hygiene

- [x] 7.1 Run full unit test suite with `bun run test:agent` to verify all new and existing agent tests pass cleanly
- [x] 7.2 Run TypeScript full-workspace type checking with `bun run check:web` and agent check to ensure zero type errors
- [x] 7.3 Run pre-commit secret credential scan with `bun scripts/check-secrets.ts` ensuring zero API keys or credentials were leaked
