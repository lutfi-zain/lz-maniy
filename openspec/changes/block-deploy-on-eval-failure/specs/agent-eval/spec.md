## MODIFIED Requirements

### Requirement: Pre-Deployment Evaluation Gating in CI/CD

The evaluation framework SHALL enforce an automated quality gate in the CI/CD pipeline that halts deployment and blocks pull request merging if agent reasoning accuracy, prompt routing heuristics, or financial compliance drops below required thresholds. The deployment workflow (`deploy-agent.yml`) SHALL explicitly declare a dependency on `eval-gate` (`needs: [eval-gate]`), guaranteeing zero deployment to Cloudflare Workers upon evaluation failure.

#### Scenario: Automated Pull Request Evaluation Run

- **WHEN** a pull request targeting `main` modifies agent prompts, tools, or model routing configurations
- **THEN** the CI/CD workflow runs the full Promptfoo golden test suite against configured models

#### Scenario: Deployment Blocker on Failure Thresholds

- **WHEN** any test case with financial tool execution fails, or overall suite pass rate falls below 95%
- **THEN** the CI/CD workflow exits with a non-zero exit code, blocking merge and preventing deployment to Cloudflare Workers
