## Context

See `proposal.md` for motivation. Our self-hosted Arize Phoenix instance (`v20.19.0`, backed by PostgreSQL 16 database `phoenix`) exposes both REST v1 endpoints (`/v1/prompts`, `/v1/datasets`, `/v1/experiments`) and relational tables (`prompts`, `prompt_versions`, `prompt_version_tags`, `prompt_labels`, `evaluators`, `llm_evaluators`, `code_evaluators`, `code_evaluator_code_versions`, `builtin_evaluators`, `dataset_evaluators`, `datasets`, `dataset_versions`, `dataset_examples`, `dataset_example_revisions`, `dataset_splits`, `experiments`, `experiment_runs`, `experiment_run_annotations`, `document_annotations`). Currently, `Prompts`, `Evaluators`, and `Datasets & Experiments` have `0 rows`, and spans lack deep OpenInference flattened attributes (`llm.input_messages.*`, `retrieval.documents.*`, `tool.parameters`), PII redaction guards, two-tier acceptance criteria, judge calibration metrics, and `HUMAN`/Note/Document annotations.

## Goals / Non-Goals

**Goals:**
- Populate and synchronize **Prompts Hub (`/prompts`)** with 4 prompt repositories (`maniyy-agent-system`, `maniyy-judge-financial-grounding`, `maniyy-judge-advisory-quality`, `maniyy-conversation-compactor`), multi-version history (`v1`, `v2`, `v3`), tool definitions, labels, and version tags (`production`, `staging`, `baseline`).
- Populate and synchronize **Evaluators (`/evaluators`)** with 3 LLM Evaluators, 3 Code Evaluators (with Python source versions), 5 Builtin Evaluators, and bind them to the golden dataset via `dataset_evaluators`.
- Populate and synchronize **Datasets & Experiments (`/datasets`)** with the 27-scenario `maniyy-financial-golden-dataset`, 2 dataset versions (`v1.0` and `v2.0`), 10 category splits (including `production_regression`), and 5 side-by-side multi-model/multi-prompt Experiments whose runs (`experiment_runs`) link directly to real OpenInference `trace_id`s and include `experiment_run_annotations`.
- Implement all **6 `phoenix-tracing` & `phoenix-evals` Enhancements**:
  1. Flattened OpenInference `LLM` span attributes (`llm.input_messages.*`, `llm.output_messages.*`, `llm.tools.*`, `llm.invocation_parameters`) enabling Chat Message Bubbles & Playground Replay.
  2. Flattened OpenInference `RETRIEVER` document attributes (`retrieval.documents.{i}.document.{id,content,score,metadata}`) and `document_annotations` enabling Retriever Document Cards.
  3. Structured `TOOL` span schemas (`tool.description`, `tool.parameters`, `output.mime_type`) and PII/credential redaction sanitizer (`sanitizeTracePayload` + `OPENINFERENCE_HIDE_INPUTS`/`OPENINFERENCE_HIDE_OUTPUTS`).
  4. Two-Tier Gate separating Hard Invariants (100% per-case pass requirement) from Suite-Level Quality Signals (`acceptanceCriteria` evaluator).
  5. Judge Calibration Benchmark (`maniyy-judge-calibration-benchmark`) computing Confusion Matrix, $\text{TPR} \ge 0.85$, $\text{TNR} \ge 0.85$, and Cohen's Kappa $\kappa \ge 0.80$ against human ground-truth labels.
  6. Multi-Source Annotations (`CODE`, `LLM`, `HUMAN`) + append-only Axial Coding `Trace Notes` & `Span Notes`.
- Provide a repeatable CLI runner (`bun run --cwd apps/agent phoenix:sync`) and unit test coverage (`apps/agent/src/__tests__/unit/phoenix-suite.test.ts`).

**Non-Goals:**
- Altering Svelte 5 UI components or ReedRich REST contracts.

## Decisions

### Decision 1: Unified Idempotent Synchronization Module (`apps/agent/eval/phoenix-suite.ts`)
- **Choice**: Build `apps/agent/eval/phoenix-suite.ts` with pure payload-builder and evaluation functions (testable in Vitest) and an execution runner (`bun run --cwd apps/agent phoenix:sync`) that synchronizes Prompts, Evaluators, Datasets, Splits, Experiments, Judge Calibration, and Deep OpenInference Span Attributes into Arize Phoenix.
- **Rationale**: Pure builder functions guarantee 100% unit-testable schema compliance for all 4 prompt repositories, 6 custom evaluators, 2 datasets (Golden 27 cases + Judge Calibration 20 cases), 10 splits, 6 experiments, Two-Tier Acceptance Criteria, and Judge Calibration metrics.

### Decision 2: Relational Integrity Across Prompts, Evaluators, Datasets, Experiments, and Traces
- **Choice**:
  ```
  [prompts] 1---N [prompt_versions] 1---N [prompt_version_tags]
     |
     +---> [llm_evaluators] (inherits [evaluators] kind='LLM')
  [code_evaluators] 1---N [code_evaluator_code_versions] (inherits [evaluators] kind='CODE')
     |
     +---> [dataset_evaluators] <--- [datasets] 1---N [dataset_versions]
                                        |
                                        +---> [dataset_examples] ---> [spans.id (span_rowid)]
                                        +---> [dataset_example_revisions]
                                        +---> [dataset_splits_dataset_examples]
                                        +---> [experiments] 1---N [experiment_runs] ---> [traces.trace_id]
                                                                     |
                                                                     +---> [experiment_run_annotations]
  [spans (RETRIEVER)] 1---N [document_annotations]
  [traces / spans]    1---N [trace_annotations / span_annotations (CODE | LLM | HUMAN | Notes)]
  ```
- **Rationale**: Linking `llm_evaluators.prompt_id` to `prompts.id`, `dataset_evaluators.dataset_id` to `datasets.id`, `dataset_examples.span_rowid` to root `spans.id`, and `experiment_runs.trace_id` to `traces.trace_id` makes every tab in Arize Phoenix cross-navigable during live architecture demonstrations.

### Decision 3: Deep OpenInference Flattening & PII Redaction Guard (`tracer.ts` & `instrument-tools.ts`)
- **Choice**:
  - Add `sanitizeTracePayload(value, options)` in `apps/agent/src/observability/tracer.ts` that masks Bearer tokens, API keys (`rd_live_*`, `fp_live_*`, `gsk_*`, `AIza*`), 16-digit NIK, and 10–16 digit bank card/account numbers, and replaces inputs/outputs with `"[REDACTED]"` when `OPENINFERENCE_HIDE_INPUTS=true` or `OPENINFERENCE_HIDE_OUTPUTS=true`.
  - Add helpers `buildOpenInferenceLlmAttributes()`, `buildOpenInferenceRetrieverAttributes()`, and `buildOpenInferenceToolAttributes()` to emit exact OpenInference flattened keys (`llm.input_messages.0.message.role`, `retrieval.documents.0.document.id`, `tool.parameters`, etc.) and backfill existing spans in `phoenix` PostgreSQL so every trace renders Chat Message Bubbles, Retriever Document Cards, and Tool Schemas.

### Decision 4: Two-Tier Acceptance Criteria & Judge Calibration Engine
- **Choice**:
  - Implement `evaluateAcceptanceCriteria(runs, criteria)` supporting both per-case **Hard Invariants** (`minPassRate = 1.0` on `idr_currency_compliance` and `tool_dispatch_accuracy`) and aggregate **Quality Signals** (`passRate` and `average` with `direction: "maximize" | "minimize"`).
  - Implement `computeJudgeCalibrationMetrics(pairs)` calculating Confusion Matrix ($\text{TP}, \text{TN}, \text{FP}, \text{FN}$), $\text{TPR} = \frac{\text{TP}}{\text{TP} + \text{FN}}$, $\text{TNR} = \frac{\text{TN}}{\text{TN} + \text{FP}}$, Accuracy, and Cohen's Kappa ($\kappa = \frac{p_o - p_e}{1 - p_e}$), backed by dataset `maniyy-judge-calibration-benchmark` in Arize Phoenix.

## Risks / Trade-offs

- **Phoenix GraphQL DataLoader Cache**: Direct database upserts require refreshing Phoenix's in-memory cache or using REST endpoints so the UI reflects changes immediately. Mitigation: Restart/flush Phoenix cache and verify via REST `/v1/datasets`, `/v1/prompts`, `/v1/experiments`, and GraphQL queries after synchronization.

## Test Strategy

- **Unit Tests (Vitest)**: `apps/agent/src/__tests__/unit/phoenix-suite.test.ts` validating prompt version definitions, evaluator schemas, dataset revision payloads, 10 split assignments, experiment run matrix calculations, OpenInference attribute flattening (`LLM`, `RETRIEVER`, `TOOL`), PII redaction guard, Two-Tier Acceptance Criteria gating, and Judge Calibration ($\text{TPR}, \text{TNR}, \kappa$).
- **Live Verification**: Query `/v1/prompts`, `/v1/datasets`, `/v1/experiments`, and PostgreSQL tables against `https://phoenix.membran.app` to confirm non-zero counts across all tabs and all 6 enhancements.
