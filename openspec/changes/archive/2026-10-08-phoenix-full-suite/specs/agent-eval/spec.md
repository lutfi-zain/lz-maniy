## ADDED Requirements

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
