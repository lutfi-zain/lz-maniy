# agent-eval Specification

## Purpose

Promptfoo-based evaluation framework that benchmarks agent system prompt quality and model reasoning across real-user financial conversation patterns, using deterministic checks and LLM-as-judge grading.

## Requirements

### Requirement: Promptfoo Configuration
The evaluation framework SHALL provide a Promptfoo configuration file that enables multi-model comparison of agent behavior across a curated test dataset.

#### Scenario: Promptfoo Config Structure
- **WHEN** a developer runs `bunx promptfoo eval` from `apps/agent/eval/`
- **THEN** the evaluation loads `promptfooconfig.yaml`, connects to the configured OMP gateway provider, and executes all test cases against each listed model

#### Scenario: Multi-Model Comparison
- **WHEN** the Promptfoo config specifies multiple Gemini models (e.g. `gemini-3.7-flash`, `gemini-3.8-flash`, `gemini-2.5-pro`)
- **THEN** each test case runs against every model and results are displayed in a comparison matrix via `bunx promptfoo view`

### Requirement: Real-User Eval Dataset
The evaluation framework SHALL include a curated dataset of 23+ test cases extracted from actual user Telegram conversations, categorized by financial reasoning pattern.

#### Scenario: Category Coverage
- **WHEN** the eval dataset is loaded
- **THEN** it contains test cases across at least 8 categories: `balance_query`, `transaction_record`, `planning_projection`, `budget_tracking`, `debt_management`, `complex_reasoning`, `wallet_management`, and `tone_format`

#### Scenario: Balance Query Test Case
- **WHEN** a test case with category `balance_query` runs (e.g. "Saldo bca saya berapa?")
- **THEN** assertions verify the agent calls `get_snapshot` or `list_wallets` and the response contains a numeric balance value

#### Scenario: Transaction Record Test Case
- **WHEN** a test case with category `transaction_record` runs (e.g. "Makan waroeng steak take away 85k dari huz")
- **THEN** assertions verify the agent calls a mutation tool (`create_transaction`) with correct amount and category inference

#### Scenario: Complex Reasoning Test Case
- **WHEN** a test case with category `complex_reasoning` runs (e.g. "kok bisa income 23jt? darimana?")
- **THEN** assertions verify the agent calls data-retrieval tools, cross-references multiple sources, and provides a grounded explanation without hallucinating income sources

### Requirement: Multi-Tier Assertion Strategy
The evaluation framework SHALL apply both deterministic and LLM-as-judge assertions to each test case.

#### Scenario: Deterministic Assertions
- **WHEN** a test case defines `requiredTools` or `mustContain` expectations
- **THEN** the framework checks tool-call presence and keyword occurrence as pass/fail criteria

#### Scenario: LLM-as-Judge Rubric Assertions
- **WHEN** a test case defines an `llm-rubric` assertion
- **THEN** the framework invokes a judge model to score the response on a rubric (e.g. "Does the agent use Indonesian Rupiah formatting and avoid hallucinating data not retrieved from tools?")

#### Scenario: Negative Content Assertions
- **WHEN** a test case defines `mustNotContain` values (e.g. `['$', 'USD']` for domestic queries)
- **THEN** the framework fails the test case if any forbidden string appears in the agent response

### Requirement: Promptfoo Custom Provider
The evaluation framework SHALL include a custom Promptfoo provider script that invokes the agent with full tool-calling capabilities, matching production behavior.

#### Scenario: Provider Script Execution
- **WHEN** Promptfoo invokes the custom provider with a test prompt
- **THEN** the provider constructs the system prompt using `buildSystemPrompt`, instantiates the model via the OMP gateway, executes `streamText` with all financial tools enabled, collects tool calls and final text, and returns the combined output to Promptfoo

#### Scenario: Tool Call Tracing in Provider Output
- **WHEN** the agent makes tool calls during a test case
- **THEN** the provider output includes a structured `toolCalls` array with `toolName` and `args` for each invocation, enabling tool-level assertions

### Requirement: Multi-Prompt Matrix Evaluation
The evaluation framework SHALL support A/B matrix benchmarking across multiple system prompt variations (Baseline Verbose, Compact Token-Optimized, and Few-Shot Golden) to compare reasoning accuracy, token consumption, and response latency.

#### Scenario: Prompt Matrix Execution
- **WHEN** Promptfoo executes an evaluation with multiple prompt files defined in `promptfooconfig.yaml`
- **THEN** each test case in the dataset is evaluated against all configured prompt variants across target models, generating an $N \times M$ comparative evaluation matrix

#### Scenario: Token Efficiency Metric Output
- **WHEN** evaluation completes for multiple system prompt variants
- **THEN** Promptfoo outputs prompt token count, completion token count, and total token cost per prompt variant, highlighting relative savings between baseline and compact prompts

### Requirement: Arize Phoenix Evaluation Export
The evaluation framework SHALL export evaluation runs, assertion results, and step-level spans directly to the self-hosted Arize Phoenix instance under a dedicated evaluation project.

#### Scenario: Experiment Trace Export to Phoenix
- **WHEN** `promptfoo eval` finishes executing test cases
- **THEN** test executions, model outputs, and assertion pass/fail statuses are transmitted to `https://phoenix.membran.app/v1/traces` with project tag `maniyy-agent-evals`

#### Scenario: Metric Synchronization with Phoenix Dashboard
- **WHEN** an evaluation run completes and traces are received by Phoenix
- **THEN** the Phoenix web UI displays the evaluation run under the Experiments view, allowing side-by-side inspection of prompt variants, latency, and rubric scores

### Requirement: Pre-Deployment Evaluation Gating in CI/CD
The evaluation framework SHALL enforce an automated quality gate in the CI/CD pipeline that halts deployment if agent accuracy or compliance drops below required thresholds.

#### Scenario: Automated Pull Request Evaluation Run
- **WHEN** a pull request targeting `main` modifies agent prompts, tools, or model routing configurations
- **THEN** the CI/CD workflow runs the full Promptfoo golden test suite against configured models

#### Scenario: Deployment Blocker on Failure Thresholds
- **WHEN** any test case with financial tool execution fails, or overall suite pass rate falls below 95%
- **THEN** the CI/CD workflow exits with a non-zero exit code, blocking merge and preventing deployment to Cloudflare Workers

### Requirement: Bidirectional Dataset and Prompt Sync with Arize Phoenix
The evaluation framework SHALL synchronize local Promptfoo test cases (`dataset.ts`) and prompt variants (`prompts/*.txt`) into Arize Phoenix Datasets, Prompts, Evaluators, and Experiments via a single deterministic CLI command (`bun run --cwd apps/agent phoenix:sync`).

#### Scenario: Idempotent LLMOps Synchronization
- **WHEN** a developer or CI pipeline executes `bun run --cwd apps/agent phoenix:sync`
- **THEN** the synchronization script idempotently updates Prompts, Evaluators, Datasets, Splits, and Experiments in Arize Phoenix without duplicating existing dataset examples or prompt tags

### Requirement: Two-Tier Invariants vs. Quality Signals Gate
The evaluation framework SHALL separate per-example hard invariants from suite-level aggregate quality signals (`acceptanceCriteria`).

#### Scenario: Per-Case Hard Invariant Enforcement
- **WHEN** an evaluation run checks deterministic financial invariants (`idr_currency_compliance` and `tool_dispatch_accuracy`)
- **THEN** any single failure on a required tool call or forbidden `$`/`USD` currency symbol immediately fails the invariant gate (`minPassRate = 1.0`)

#### Scenario: Suite-Level Quality Signal Acceptance Criteria
- **WHEN** an evaluation run scores stochastic quality signals (`financial_grounding_judge`, `advisory_rubric_judge`, and `latency_ms`)
- **THEN** the suite evaluates aggregate acceptance criteria requiring `financial_grounding_judge` passRate $\ge 0.92$, `advisory_rubric_judge` average $\ge 0.88$ (`direction: "maximize"`), and `latency_ms` average $\le 3500\text{ms}$ (`direction: "minimize"`)
