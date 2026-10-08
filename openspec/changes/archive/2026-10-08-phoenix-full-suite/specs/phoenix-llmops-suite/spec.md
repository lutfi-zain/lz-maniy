## Purpose

Comprehensive Arize Phoenix LLMOps governance suite managing Prompt Hub version repositories, LLM and deterministic Code Evaluators, Golden and Judge-Calibration Datasets with category splits, Two-Tier Acceptance Criteria gates, Multi-Source (`CODE`, `LLM`, `HUMAN`, Notes, Document) annotations, and side-by-side Experiment runs linked to distributed OpenInference traces.

## ADDED Requirements

### Requirement: Arize Phoenix Prompts Hub Management
The LLMOps synchronization suite SHALL register, version, label, and tag system and judge prompts in the Arize Phoenix Prompts Hub (`/prompts`).

#### Scenario: Multi-Version System Prompt Lineage
- **WHEN** `phoenix:sync` runs against the Arize Phoenix server
- **THEN** the `maniyy-agent-system` prompt repository is populated with 3 sequential versions (`v1: Baseline Verbose`, `v2: Compact Token-Optimized`, `v3: Few-Shot Telegram Golden`), each storing chat messages, invocation parameters, model configuration, and 8 financial tool schemas

#### Scenario: Judge and Compaction Prompt Registration
- **WHEN** `phoenix:sync` synchronizes auxiliary agent prompts
- **THEN** the Prompts Hub contains versioned repositories for `maniyy-judge-financial-grounding`, `maniyy-judge-advisory-quality`, and `maniyy-conversation-compactor` with `production`, `staging`, and `baseline` version tags

### Requirement: Arize Phoenix Evaluators Registry
The LLMOps synchronization suite SHALL register LLM Evaluators, Code Evaluators, and Dataset Evaluator bindings in the Arize Phoenix Evaluators view (`/evaluators`).

#### Scenario: LLM Evaluator Registration Linked to Prompts Hub
- **WHEN** LLM evaluators are synchronized
- **THEN** `financial_grounding_judge`, `advisory_rubric_judge`, and `multi_intent_completeness_judge` are created with `kind = 'LLM'`, linked to their backing prompt versions and `production` tags in the Prompts Hub, and configured with categorical/continuous `output_configs`

#### Scenario: Deterministic Code Evaluator Registration
- **WHEN** Code evaluators are synchronized
- **THEN** `idr_currency_compliance`, `tool_dispatch_accuracy`, and `credit_settlement_audit` are created with `kind = 'CODE'`, Python evaluator source code stored in `code_evaluator_code_versions`, and structured `input_mapping`

#### Scenario: Dataset Evaluator Binding
- **WHEN** evaluators are bound to the golden financial dataset
- **THEN** `dataset_evaluators` links the registered LLM, Code, and Builtin evaluators to `maniyy-financial-golden-dataset` and the `maniyy-agent-evals` project so every experiment run automatically displays evaluator score columns

### Requirement: Arize Phoenix Datasets and Splits Management
The LLMOps synchronization suite SHALL maintain versioned golden financial datasets, a judge calibration dataset, and category splits in the Arize Phoenix Datasets view (`/datasets`).

#### Scenario: Golden Dataset Version Lineage
- **WHEN** the golden dataset is synchronized
- **THEN** `maniyy-financial-golden-dataset` records `v1.0` (initial 23 real-user Telegram scenarios) and `v2.0` (expanded 27 scenarios including multi-intent and reconciliation), with each example storing structured `input`, `output` expectations, `metadata`, and linked `span_rowid`

#### Scenario: Category and Production Regression Dataset Splits
- **WHEN** dataset splits are synchronized
- **THEN** dataset examples are partitioned into 10 color-coded splits (`balance_query`, `transaction_record`, `planning_projection`, `budget_tracking`, `debt_management`, `complex_reasoning`, `wallet_management`, `tone_format`, `high_risk_mutation`, and `production_regression`)

### Requirement: Arize Phoenix Experiments Matrix Execution
The LLMOps synchronization suite SHALL record multi-model and multi-prompt experiments with per-example runs and evaluator annotations in Arize Phoenix.

#### Scenario: Side-by-Side Experiment Matrix Recording
- **WHEN** experiment synchronization runs across the prompt and model matrix
- **THEN** Phoenix records 5 named experiments comparing `Baseline v1`, `Compact v2`, and `Few-Shot v3` across `gemini-3.7-flash` and `gemini-3.8-flash`, linked to the `maniyy-agent-evals` trace project

#### Scenario: Experiment Run Trace Correlation and Annotations
- **WHEN** each of the 27 dataset examples is recorded in an experiment run
- **THEN** `experiment_runs` stores the structured agent output, latency window, prompt and completion token counts, links `trace_id` to its 5-level OpenInference trace waterfall, and attaches `experiment_run_annotations` for `tool_accuracy`, `currency_compliance`, `hallucination_guard`, and `prompt_efficiency`

### Requirement: Judge Calibration and Meta-Evaluation
The LLMOps synchronization suite SHALL validate LLM-as-a-judge evaluators against human expert ground-truth labels before trusting judge scores in CI/CD or production.

#### Scenario: Confusion Matrix and Cohen's Kappa Calibration
- **WHEN** the judge calibration benchmark (`maniyy-judge-calibration-benchmark`) is evaluated against human-labeled pass/fail financial responses
- **THEN** the calibration engine computes True Positive Rate ($\text{TPR}$), True Negative Rate ($\text{TNR}$), overall accuracy, and Cohen's Kappa ($\kappa$), verifying $\text{TPR} \ge 0.85$, $\text{TNR} \ge 0.85$, and $\kappa \ge 0.80$, and records the calibration experiment in Arize Phoenix

### Requirement: Multi-Source Annotations and Axial Coding Notes
The LLMOps synchronization suite SHALL record human feedback annotations (`annotator_kind = 'HUMAN'`), axial-coding trace/span notes, and retriever document relevance annotations (`document_annotations`).

#### Scenario: Human Feedback and Axial Coding Review Notes
- **WHEN** human review feedback and error analysis annotations are synchronized
- **THEN** `trace_annotations` and `span_annotations` include `HUMAN` reviewer scores alongside `CODE` and `LLM` scores, append-only axial coding `note` entries, and `document_annotations` scoring each retrieved memory/context document
