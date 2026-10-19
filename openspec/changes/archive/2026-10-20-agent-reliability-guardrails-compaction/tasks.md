## 1. D1 Flywheel Schema Migration & Domain Taxonomy

- [x] 1.1 Create migration `0007_guardrails_compaction_flywheel.sql` using SQLite table recreation pattern extending `eval_queue` (`guardrail_trip`, `iteration_exhaustion`) and `eval_dataset_candidates` (`guardrail_safety`, `compaction_retention`, `guardrail_compliance`, `context_retention`).
- [x] 1.2 Update D1 query interfaces and types in `apps/agent/src/db/queries.ts` and `apps/agent/src/observability/flywheel.ts` to recognize the new triggers, rubrics, and domain categories.
- [x] 1.3 Add unit test in `apps/agent/src/__tests__/unit/flywheel-schema.test.ts` verifying constraint validation and candidate staging. Acceptance: `bun test apps/agent/src/__tests__/unit/flywheel-schema.test.ts` passes.

## 2. Adaptive High-Iteration Engine & Circuit Breaker

- [x] 2.1 Implement intent-based dynamic step budgeting (`classifyStepBudget`) in `apps/agent/src/agent/iteration-budget.ts` scaling from 5 to 40 steps.
- [x] 2.2 Implement signature-based rolling cycle breaker (`ToolCycleBreaker`) with `canonicalJsonStringify` to detect and abort identical ping-pong tool calls invariant to JSON key ordering.
- [x] 2.3 Update `apps/agent/src/routes/chat.ts` to wire dynamic `maxSteps`, cycle breaker, volatile tool result pruning, and intermediate SSE progress telemetry frames using AI SDK Data Stream array prefix `2:[{"type":"progress",...}]\n` (preventing collision with `d:` credit settlement).
- [x] 2.4 Implement and verify guaranteed fallback synthesis when `maxSteps` is exhausted with captured tool results.
- [x] 2.5 Add unit tests in `apps/agent/src/__tests__/unit/iteration-budget.test.ts` verifying step limit scaling, loop termination, and fallback synthesis. Acceptance: `bun test apps/agent/src/__tests__/unit/iteration-budget.test.ts` passes.

## 3. Entity-Preserving Compaction & Token Accounting

- [x] 3.1 Refactor `apps/agent/src/agent/compaction.ts` to calculate tokens across full tool payloads (calls and results) with subword/character estimation (`chars / 3.2`).
- [x] 3.2 Lower operational working memory compaction ceiling to 20,000 tokens and update `apps/agent/src/agent/models.ts`.
- [x] 3.3 Upgrade `compactConversation` in `apps/agent/src/agent/compaction-worker.ts` to use extractive-abstractive financial snapshot extraction (wallet balances, IDs, commitments).
- [x] 3.4 Fix context injection in `apps/agent/src/routes/chat.ts` and `apps/agent/src/agent/system-prompt.ts` so `compaction_summary` is cleanly injected into the prompt rather than stripped by role filters.
- [x] 3.5 Add unit tests in `apps/agent/src/__tests__/unit/compaction.test.ts` verifying payload token estimation, threshold triggers, and entity preservation. Acceptance: `bun test apps/agent/src/__tests__/unit/compaction.test.ts` passes.

## 4. 4-Tier Agentic Guardrails Architecture

- [x] 4.1 Implement Tier 1 Input Guardrail (`apps/agent/src/agent/guardrails/input-guard.ts`) with dual-language regex (English + Indonesian), zero-width stripping, and `<untrusted_user_data>` fencing against indirect prompt injection in statement and transaction data.
- [x] 4.2 Implement Tier 2 Dialog Policy Rails (`apps/agent/src/agent/guardrails/policy-guard.ts`) with locked cash defense and two-phase confirmation token verification for high-value mutations (> Rp 5.000.000) or wallet deletions.
- [x] 4.3 Implement Tier 3 Execution Rails with Zod schema bounds and user tenant isolation in tool wrappers.
- [x] 4.4 Implement Tier 4 In-Band Output Guardrail (`apps/agent/src/agent/guardrails/output-guard.ts`) with numeric grounding supporting arithmetic derivations (sums, differences, FX conversions) and currency format normalization.
- [x] 4.5 Add comprehensive unit tests in `apps/agent/src/__tests__/unit/guardrails.test.ts` verifying all 4 tiers. Acceptance: `bun test apps/agent/src/__tests__/unit/guardrails.test.ts` passes.

## 5. Multi-Level AI Evaluation & CI Regression Suite

- [x] 5.1 Implement Level 0 Code Evaluators (`evalIterationEfficiency`, `evalInputInjectionDefense`, `evalCompactionRetention`) in `apps/agent/src/observability/evaluators.ts`.
- [x] 5.2 Extend Level 1 Async LLM Judge rubrics in `apps/agent/src/observability/async-judge.ts` for `guardrailCompliance` and `contextRetention` with a Two-Tier Veto Gate.
- [x] 5.3 Add new test cases to `apps/agent/eval/dataset.ts` for `guardrail_safety` and `compaction_retention`, and update `flywheel.ts` to pass `ScrubberContext` for real-name scrubbing and support `t.toolName || t.name`.
- [x] 5.4 Update `apps/agent/eval/promptfooconfig.yaml` with adversarial attack and multi-turn compaction scenarios.
- [x] 5.5 Update OpenInference OTLP span attributes in `apps/agent/src/observability/tracer.ts` for iteration count, loop breaker status, and guardrail decisions.

## 6. End-to-End Verification & Secret Hygiene

- [x] 6.1 Run full agent unit test suite (`bun run test:agent`) and verify zero regressions across all test files. Acceptance: `bun run test:agent` exits with code 0.
- [x] 6.2 Run pre-commit secret hygiene checks (`bun scripts/check-secrets.ts`) and verify no credentials or tokens are exposed. Acceptance: `bun scripts/check-secrets.ts` exits clean.
