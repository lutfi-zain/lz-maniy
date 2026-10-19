## MODIFIED Requirements

### Requirement: Multi-Prompt Matrix Evaluation

The evaluation framework SHALL support A/B matrix benchmarking across multiple system prompt variations (Baseline Canonical, Compact Token-Optimized, and Few-Shot Golden) synchronized with production decision heuristics, to compare reasoning accuracy, token consumption, and response latency. All prompt variants SHALL incorporate the Intent-to-Tool Decision Matrix, mandatory `horizon_projection` routing, and standardized Markdown output formatting.

#### Scenario: Prompt Matrix Execution

- **WHEN** Promptfoo executes an evaluation with multiple prompt files defined in `promptfooconfig.yaml`
- **THEN** each test case in the dataset is evaluated against all configured prompt variants across target models, generating an $N \times M$ comparative evaluation matrix

#### Scenario: Token Efficiency Metric Output

- **WHEN** evaluation completes for multiple system prompt variants
- **THEN** Promptfoo outputs prompt token count, completion token count, and total token cost per prompt variant, highlighting relative savings between baseline and compact prompts

### Requirement: Bidirectional Dataset and Prompt Sync with Arize Phoenix

The evaluation framework SHALL synchronize local Promptfoo test cases (`dataset.ts`) and prompt variants (`prompts/*.txt`) into Arize Phoenix Datasets, Prompts, Evaluators, and Experiments as well as Langfuse Cloud Prompt Registry via deterministic CLI commands (`bun run --cwd apps/agent phoenix:sync` and `bun run --cwd apps/agent observability:sync`), guaranteeing zero prompt drift between LLMOps registries and production code.

#### Scenario: Idempotent LLMOps Synchronization

- **WHEN** a developer or CI pipeline executes `bun run --cwd apps/agent phoenix:sync`
- **THEN** the synchronization script idempotently updates Prompts, Evaluators, Datasets, Splits, and Experiments in Arize Phoenix without duplicating existing dataset examples or prompt tags
