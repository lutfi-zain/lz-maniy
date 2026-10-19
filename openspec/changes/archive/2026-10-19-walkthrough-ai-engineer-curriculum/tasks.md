## 1. Master Curriculum Blueprint

- [x] 1.1 Create `apps/agent/WALKTHROUGH.md` containing the architectural overview diagram, the complete 6-stage master index table, operational CLI cheatsheets, and the 5-minute agent replication recipe with minimal 6-file manifest
- [x] 1.2 Verify that all reference links in `WALKTHROUGH.md` include dual pointers to authoritative documentation and internal Donna OKF vault modules (`okf://knowledge/ai-evals-course/...` and `okf://knowledge/langfuse-vercel-ai-sdk/...`) with concise concept summaries

## 2. Stage 01 & Stage 02 Inline Annotations (Foundations, Providers & Streaming)

- [x] 2.1 Annotate `apps/agent/src/index.ts` with JSDoc `@walkthrough 01.01:worker-entrypoint` and `@walkthrough 01.03:hono-routing-layer`
- [x] 2.2 Annotate `apps/agent/wrangler.toml` with hash comment tag `# @walkthrough 01.02:environment-bindings`
- [x] 2.3 Annotate `apps/agent/src/agent/models.ts` with JSDoc `@walkthrough 02.01:multi-provider-model`
- [x] 2.4 Annotate `apps/agent/src/routes/chat.ts` with JSDoc `@walkthrough 02.02:edge-sse-streaming` and `@walkthrough 02.03:resilient-fallback`

## 3. Stage 03 & Stage 04 Inline Annotations (Prompts, Tools, Context & Memory)

- [x] 3.1 Annotate `apps/agent/src/agent/system-prompt.ts` with JSDoc `@walkthrough 03.01:system-prompt-ssot`
- [x] 3.2 Annotate `apps/agent/src/agent/tools/financial.ts` with JSDoc `@walkthrough 03.02:zod-tool-definition`
- [x] 3.3 Annotate `apps/agent/src/agent/tools/mutations.ts` with JSDoc `@walkthrough 03.03:tool-execution-guard`
- [x] 3.4 Annotate `apps/agent/src/agent/history.ts` with JSDoc `@walkthrough 04.01:history-sanitization`
- [x] 3.5 Annotate `apps/agent/src/agent/compaction.ts` with JSDoc `@walkthrough 04.02:token-compaction`
- [x] 3.6 Annotate `apps/agent/src/agent/tools/memory.ts` with JSDoc `@walkthrough 04.03:long-term-memory`

## 4. Stage 05 Inline Annotations (The Complete AI Evaluation Pyramid)

- [x] 4.1 Annotate `apps/agent/src/observability/evaluators.ts` with JSDoc `@walkthrough 05.01:eval-code-grounding` (Level 0: Deterministic Invariants)
- [x] 4.2 Annotate `apps/agent/src/observability/async-judge.ts`, `apps/agent/src/routes/eval.ts`, and `apps/agent/db/migrations/0006_eval_flywheel.sql` with `@walkthrough 05.02:async-llm-judge` (Level 1: Semantic LLM Judge & D1 Queue)
- [x] 4.3 Annotate `apps/agent/eval/promptfooconfig.yaml` and `apps/agent/eval/grader.ts` with `@walkthrough 05.03:eval-promptfoo-gate` (Level 2: Pre-Deploy CI Gate)
- [x] 4.4 Annotate `apps/agent/eval/phoenix-suite.ts` and `apps/agent/eval/dataset.ts` with JSDoc `@walkthrough 05.04:eval-phoenix-suite` (Level 3: Offline Benchmarks & Golden Datasets)
- [x] 4.5 Annotate `apps/agent/src/observability/tracer.ts` and `apps/agent/src/middleware/tracing.ts` with JSDoc `@walkthrough 05.05:eval-otel-tracing` (Level 4: OpenInference Distributed Tracing & Telemetry)
- [x] 4.6 Annotate `apps/agent/src/observability/pii-scrubber.ts` with JSDoc `@walkthrough 05.06:pii-scrubber` (Data Governance: 4-Pass PII Scrubber)
- [x] 4.7 Annotate `apps/agent/src/observability/flywheel.ts`, `apps/agent/eval/flywheel-sync.ts`, and `apps/agent/src/db/queries.ts` with `@walkthrough 05.07:dataset-flywheel` (Closed-Loop CI Regression Flywheel)

## 5. Automated Verification & Quality Assurance

- [x] 5.1 Implement `apps/agent/src/__tests__/unit/walkthrough-integrity.test.ts` to assert bidirectional parity (every tag in `WALKTHROUGH.md` exists in code, every tag in code is registered in `WALKTHROUGH.md`) and validate non-empty `@topic`, `@ref`, and `@notes` attributes
- [x] 5.2 Execute `bun run test:agent` to verify all walkthrough integrity unit tests pass cleanly alongside existing agent suites
- [x] 5.3 Run credential secret scan with `bun scripts/check-secrets.ts` ensuring zero API keys or credentials were introduced
