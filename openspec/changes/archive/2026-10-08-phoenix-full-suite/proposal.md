## Why

While Arize Phoenix distributed tracing (`POST /v1/traces`) and metrics charts are operational for the Maniyy v2 financial agent, the three top-level LLMOps governance pillars in the Arize Phoenix console—**Prompts Hub (`/prompts`)**, **Evaluators (`/evaluators`)**, and **Datasets & Experiments (`/datasets`)**—are currently empty (`0 rows`), and existing spans only populate basic `input.value`/`output.value` strings rather than deep OpenInference semantic conventions and `phoenix-evals` calibration workflows. Completing the 3 Phoenix tabs together with the 6 `phoenix-tracing` and `phoenix-evals` enhancements transforms our observability deployment into a complete enterprise LLMOps control plane ready for executive architecture review.

## What Changes

- **Arize Phoenix Prompts Hub Synchronization (`/prompts`)**:
  - Implement a Prompt Hub synchronization module (`apps/agent/eval/phoenix-suite.ts`) that registers and versions 4 core prompt repositories in Arize Phoenix (`maniyy-agent-system`, `maniyy-judge-financial-grounding`, `maniyy-judge-advisory-quality`, and `maniyy-conversation-compactor`).
  - Populate multi-version lineage (`v1: Baseline Verbose`, `v2: Compact Token-Optimized`, `v3: Few-Shot Telegram Golden`) with OpenAI/Gemini invocation parameters, 8 financial tool JSON schemas, color-coded prompt labels, and release tags (`production`, `staging`, `baseline`).
- **Arize Phoenix Evaluators Registry (`/evaluators`)**:
  - Register **LLM Evaluators** (`financial_grounding_judge`, `advisory_rubric_judge`, `multi_intent_completeness_judge`) backed by versioned prompts in the Prompts Hub and structured `output_configs`.
  - Register **Code Evaluators** (`idr_currency_compliance`, `tool_dispatch_accuracy`, `credit_settlement_audit`) with versioned Python evaluator source code in `code_evaluator_code_versions`.
  - Bind registered LLM, Code, and Builtin evaluators to the golden financial dataset via `dataset_evaluators` with explicit `input_mapping` and `output_configs`.
- **Arize Phoenix Datasets & Experiments Matrix (`/datasets`)**:
  - Upload and version the 27-scenario `maniyy-financial-golden-dataset` (`v1.0` initial 23 Telegram scenarios and `v2.0` expanded 27 multi-intent scenarios) with structured `input`, `output` (expected tool calls and reference rubric), and `metadata`.
  - Partition dataset examples across 10 color-coded **Dataset Splits** (`balance_query`, `transaction_record`, `planning_projection`, `budget_tracking`, `debt_management`, `complex_reasoning`, `wallet_management`, `tone_format`, `high_risk_mutation`, and `production_regression`).
  - Execute and record side-by-side **Experiments** ($3 \text{ Prompt Variants} \times 2 \text{ Gemini Models}$) with per-example `experiment_runs` linked via `trace_id` to their 5-level OpenInference waterfall traces and graded via `experiment_run_annotations`.
- **6 Advanced `phoenix-tracing` & `phoenix-evals` Enhancements**:
  1. **Deep OpenInference `LLM` Span Attributes (Chat Bubbles & Playground Replay)**: Populate flattened `llm.input_messages.{i}.message.{role,content}`, `llm.output_messages.0.message.{role,content}`, `llm.output_messages.0.message.tool_calls.{j}.tool_call.function.{name,arguments}`, `llm.tools.{k}.tool.json_schema`, and `llm.invocation_parameters` on `LLM` spans so Phoenix renders native Chat Message Bubbles and activates "Open in Playground".
  2. **Deep OpenInference `RETRIEVER` Document Cards & `document_annotations`**: Populate `retrieval.documents.{i}.document.{id,content,score,metadata}` on `RETRIEVER` spans (`memory.getAgentMemory`, `state.hydratePageContext`) and record per-document relevance scores in `document_annotations`.
  3. **Structured `TOOL` Span Schemas & PII Redaction Guard**: Populate `tool.description`, `tool.parameters` (JSON Schema), and `output.mime_type = "application/json"` on `TOOL` spans, enforced by an automatic PII/credential redaction sanitizer (`sanitizeTracePayload`, respecting `OPENINFERENCE_HIDE_INPUTS` / `OPENINFERENCE_HIDE_OUTPUTS` and masking Bearer tokens, API keys, NIK, and bank card numbers).
  4. **Two-Tier Gate: Hard Invariants vs. Quality Signals (`acceptanceCriteria`)**: Formalize a two-tier evaluation gate separating per-case **Hard Invariants** (`idr_currency_compliance` = 100%, `tool_dispatch_accuracy` = 100%) from suite-level aggregate **Quality Signals** (`financial_grounding_judge` passRate $\ge 0.92$, `advisory_rubric_judge` mean $\ge 0.88$, `latency_ms` mean $\le 3500\text{ms}$ with `direction: "minimize"`).
  5. **LLM-as-a-Judge Calibration Benchmark (TPR / TNR / Cohen's Kappa)**: Create a dedicated calibration dataset (`maniyy-judge-calibration-benchmark`) and experiment validating LLM judge predictions against human expert labels, computing and asserting True Positive Rate ($\text{TPR} \ge 0.85$), True Negative Rate ($\text{TNR} \ge 0.85$), and Cohen's Kappa ($\kappa \ge 0.80$).
  6. **Multi-Source Annotations (`CODE`, `LLM`, `HUMAN`) + Axial Coding Trace/Span Notes**: Populate `HUMAN` annotations (user thumbs-up/down & Tech Lead audit reviews), append-only `Trace Notes` and `Span Notes` with axial-coding failure classifications, and route production failure traces into the `production_regression` dataset split.

### Scope Boundaries

- **In Scope**: Programmatic synchronization CLI (`bun run --cwd apps/agent phoenix:sync`), OpenInference attribute enrichment and PII redaction in `tracer.ts`, `instrument-tools.ts`, and `provider.ts`, Phoenix synchronization for Prompts, Evaluators, Datasets, Splits, Experiments, Judge Calibration, and Human/Note/Document annotations, plus unit test verification.
- **Non-Goals (Out of Scope)**: Modifying Svelte 5 financial UI layouts or changing ReedRich MCP database schemas.

## Capabilities

### New Capabilities

- `phoenix-llmops-suite`: End-to-end management and synchronization of Arize Phoenix Prompts Hub, Evaluators (LLM, Code, and Builtin), Golden & Judge-Calibration Datasets with category splits, multi-model/multi-prompt Experiments, Two-Tier Acceptance Criteria gates, and Multi-Source (`CODE`/`LLM`/`HUMAN`/Notes/Document) annotations.

### Modified Capabilities

- `agent-eval`: Extend the evaluation harness with Two-Tier Invariant vs. Quality Signal acceptance criteria, Judge Calibration validation ($\text{TPR}/\text{TNR}/\kappa$), and bidirectional synchronization into Arize Phoenix.
- `agent-observability`: Enrich OpenInference `LLM`, `RETRIEVER`, and `TOOL` spans with flattened messages, tool schemas, retrieval documents, `document_annotations`, and PII redaction guards, and link spans directly to `dataset_examples` and `experiment_runs`.

## Impact

- **`apps/agent/src/observability/tracer.ts` & `instrument-tools.ts`**: Add PII/credential redaction sanitizer and deep OpenInference flattened attributes for `LLM`, `RETRIEVER`, and `TOOL` spans.
- **`apps/agent/eval/phoenix-suite.ts`**: Synchronization module, Two-Tier Acceptance Criteria evaluator, Judge Calibration calculator ($\text{TPR}, \text{TNR}, \kappa$), and CLI runner (`bun run --cwd apps/agent phoenix:sync`).
- **`apps/agent/package.json`**: Add `phoenix:sync` script.
- **`apps/agent/src/__tests__/unit/phoenix-suite.test.ts`**: Unit tests covering all 3 Phoenix tabs and all 6 `phoenix-tracing` / `phoenix-evals` enhancements.
