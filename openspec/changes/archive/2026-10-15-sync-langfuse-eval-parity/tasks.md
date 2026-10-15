## 1. Langfuse Score Configs Synchronization

- [x] 1.1 Implement `syncLangfuseScoreConfigs` in `apps/agent/eval/observability-sync.ts` registering 8 canonical score configs (`financial_grounding_judge`, `advisory_rubric_judge`, `multi_intent_completeness`, `idr_currency_compliance`, `tool_dispatch_accuracy`, `credit_settlement_audit`, `human_audit_review`, `user_feedback`, and `latency_ms`) via `POST /api/public/score-configs`. Acceptance: Running `bun apps/agent/eval/observability-sync.ts` creates all 8 configs without error and handles idempotency on re-run.
- [x] 1.2 Write unit tests in `apps/agent/src/__tests__/unit/observability-sync.test.ts` verifying score config creation, mapping of categorical values, and error tolerance. Acceptance: `bun test apps/agent/src/__tests__/unit/observability-sync.test.ts` passes with 100% assertions.

## 2. Runtime Continuous Evaluation Score Streaming

- [x] 2.1 Implement `streamScoresToLangfuse` in `apps/agent/src/routes/chat.ts` to post continuous evaluation results (`evalNumericGrounding`, `evalCurrencyGovernance`, `evalNoEmoji`, `evalLockedCashGuard`) to Langfuse Scores API (`POST /api/public/scores`). Acceptance: Score payloads match `{ name, value, comment, traceId, sessionId, dataType }` and execute within `c.executionCtx.waitUntil()` guarded by a 3000ms timeout.
- [x] 2.2 Add unit tests in `apps/agent/src/__tests__/unit/chat-eval-scores.test.ts` verifying that `evaluateTurn` results trigger `streamScoresToLangfuse` with correct categorical scores and do not block the streaming response. Acceptance: `bun test apps/agent/src/__tests__/unit/chat-eval-scores.test.ts` passes.

## 3. User Feedback Score Ingestion & Config Binding

- [x] 3.1 Update `apps/agent/src/routes/feedback.ts` `streamToLangfuse` to use `dataType: 'CATEGORICAL'`, map values (`1.0` to positive, `0.0` to negative), and attach the resolved `user_feedback` score configuration ID. Acceptance: Thumbs-up/down requests stream categorical scores to Langfuse.
- [x] 3.2 Update `apps/agent/src/__tests__/unit/feedback.test.ts` to assert that Langfuse score payload contains categorical data type and expected config identifier. Acceptance: `bun test apps/agent/src/__tests__/unit/feedback.test.ts` passes.

## 4. Benchmark Matrix Runs Export to Langfuse

- [x] 4.1 Implement `syncLangfuseExperimentRuns` in `apps/agent/eval/observability-sync.ts` to export benchmark runs across prompt variants (`system-baseline`, `system-compact`, `system-fewshot`) to Langfuse Dataset Runs (`POST /api/public/dataset-run-items`) linked to `maniyy-agent-golden-dataset`. Acceptance: Experiment runs and assertion scores appear under Langfuse dataset runs.
- [x] 4.2 Add unit tests in `apps/agent/src/__tests__/unit/experiment-sync.test.ts` verifying benchmark run payload formatting and assertion score attachments. Acceptance: `bun test apps/agent/src/__tests__/unit/experiment-sync.test.ts` passes.

## 5. Custom Model Pricing & Telegram Deep Links

- [x] 5.1 Implement `syncLangfuseModelPricing` in `apps/agent/eval/observability-sync.ts` to register `google-antigravity/gemini-3.8-flash`, `3.5-flash-lite`, `3.1-flash-lite`, and `2.5-flash-lite` pricing via `POST /api/public/models`. Acceptance: Custom models register with non-zero input/output token pricing.
- [x] 5.2 Update `apps/agent/src/observability/alerts.ts` to generate direct trace detail deep links for Arize Phoenix and Langfuse Cloud (`${phoenixBaseUrl}/projects/.../traces/${traceId}` and `${langfuseBaseUrl}/project/.../traces/${traceId}`). Acceptance: Telegram alert text contains clickable direct trace URLs when trace ID is present.
- [x] 5.3 Write unit tests in `apps/agent/src/__tests__/unit/alerts.test.ts` verifying trace deep link formatting for both platforms. Acceptance: `bun test apps/agent/src/__tests__/unit/alerts.test.ts` passes.

## 6. Testing, Secret Audit & Parity Verification

- [x] 6.1 Execute full unit test suite across `apps/agent` and full workspace type checking. Acceptance: `bun run test:agent` and `bun run check:web` pass with 0 errors.
- [x] 6.2 Execute pre-commit secret scan across git tree. Acceptance: `bun scripts/check-secrets.ts` passes with 0 findings.
