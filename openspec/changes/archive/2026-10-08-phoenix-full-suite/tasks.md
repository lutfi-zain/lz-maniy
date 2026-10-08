## 1. Deep OpenInference Span Attributes & PII Redaction (`phoenix-tracing`)

- [x] 1.1 Update `apps/agent/src/observability/tracer.ts` and `apps/agent/src/observability/instrument-tools.ts` with `sanitizeTracePayload` (redacting Bearer tokens, API keys, NIK, and bank account numbers, plus honoring `OPENINFERENCE_HIDE_INPUTS` / `OPENINFERENCE_HIDE_OUTPUTS`) and OpenInference attribute builders (`buildOpenInferenceLlmAttributes`, `buildOpenInferenceRetrieverAttributes`, `buildOpenInferenceToolAttributes`). (Verify: `bun run test:agent`)
- [x] 1.2 Update `apps/agent/eval/provider.ts` and `apps/agent/src/routes/chat.ts` to attach flattened `llm.input_messages.*`, `llm.output_messages.*`, `llm.tools.*`, `llm.invocation_parameters`, `retrieval.documents.*`, and `tool.parameters` on live and evaluation spans. (Verify: `bun run test:agent`)

## 2. Prompts Hub Synchronization (`/prompts`)

- [x] 2.1 Create `apps/agent/eval/phoenix-suite.ts` with schema builders for the 4 prompt repositories (`maniyy-agent-system`, `maniyy-judge-financial-grounding`, `maniyy-judge-advisory-quality`, `maniyy-conversation-compactor`), 3 sequential prompt versions (`v1: Baseline`, `v2: Compact`, `v3: Few-Shot`), 8 financial tool JSON schemas, prompt labels, and version tags (`production`, `staging`, `baseline`). (Verify: `bun run test:agent`)
- [x] 2.2 Synchronize all Prompts, Prompt Versions, Prompt Version Tags, and Prompt Labels into Arize Phoenix and verify via `GET https://phoenix.membran.app/v1/prompts`. (Verify: `curl -s https://phoenix.membran.app/v1/prompts`)

## 3. Evaluators Registry & Judge Calibration (`/evaluators`)

- [x] 3.1 Implement evaluator registration in `apps/agent/eval/phoenix-suite.ts` for 3 LLM Evaluators (`financial_grounding_judge`, `advisory_rubric_judge`, `multi_intent_completeness_judge`) linked to Prompts Hub versions and 3 deterministic Code Evaluators (`idr_currency_compliance`, `tool_dispatch_accuracy`, `credit_settlement_audit`) with Python source versions in `code_evaluator_code_versions`. (Verify: `bun run test:agent`)
- [x] 3.2 Implement `evaluateAcceptanceCriteria` (Two-Tier Gate: Hard Invariants vs. Quality Signals) and `computeJudgeCalibrationMetrics` ($\text{TPR} \ge 0.85$, $\text{TNR} \ge 0.85$, Cohen's Kappa $\kappa \ge 0.80$) in `apps/agent/eval/phoenix-suite.ts`, and bind all LLM, Code, and Builtin Evaluators to `maniyy-financial-golden-dataset` in `dataset_evaluators`. (Verify: `bun run test:agent`)

## 4. Datasets, Splits, Experiments & Multi-Source Annotations (`/datasets`)

- [x] 4.1 Implement Golden Dataset & Judge Calibration Dataset synchronization in `apps/agent/eval/phoenix-suite.ts`, uploading `maniyy-financial-golden-dataset` (`v1.0` and `v2.0`, 27 cases) and `maniyy-judge-calibration-benchmark` (20 human-labeled calibration cases), linking `dataset_examples.span_rowid`, and partitioning examples across 10 color-coded `dataset_splits` (including `production_regression`). (Verify: `curl -s https://phoenix.membran.app/v1/datasets`)
- [x] 4.2 Materialize the 5 side-by-side Agent Experiments ($135 \text{ runs}$) plus 1 Judge Calibration Experiment ($20 \text{ runs}$), linking `experiment_runs.trace_id`, backfilling deep OpenInference attributes (`llm.input_messages.*`, `retrieval.documents.*`, `tool.parameters`), and populating `experiment_run_annotations`, `document_annotations`, `HUMAN` feedback annotations, and Axial Coding `Trace/Span Notes`. (Verify: `curl -s https://phoenix.membran.app/v1/datasets`)
- [x] 4.3 Add `"phoenix:sync": "bun run eval/phoenix-suite.ts"` to `apps/agent/package.json` and execute full synchronization against `https://phoenix.membran.app`. (Verify: `bun run --cwd apps/agent phoenix:sync`)

## 5. Test Suites & Security Verification

- [x] 5.1 Create unit test suite `apps/agent/src/__tests__/unit/phoenix-suite.test.ts` testing OpenInference attribute builders, PII redaction, prompt version builders, evaluator definitions, Two-Tier acceptance criteria, Judge Calibration ($\text{TPR}/\text{TNR}/\kappa$), dataset splits, and experiment matrix generation. (Verify: `bun run test:agent`)
- [x] 5.2 Run full workspace unit tests, type checks, and secret credential scans to verify zero regressions and zero exposed secrets. (Verify: `bun run test:web && bun run test:agent && bun run check:web && bun scripts/check-secrets.ts`)
