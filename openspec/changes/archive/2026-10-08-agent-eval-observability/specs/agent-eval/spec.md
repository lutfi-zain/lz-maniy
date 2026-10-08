## ADDED Requirements

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
