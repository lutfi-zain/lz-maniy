# Proposal: Enforce Blocking CI/CD on Evaluation Failure Before Deployment & PR Merge

## Why

Currently, `.github/workflows/deploy-agent.yml` deploys the AI financial agent directly to Cloudflare Workers on every push to `main` without executing evaluation benchmarks, unit tests, or type checking prior to `wrangler deploy`. Additionally, while `.github/workflows/agent-eval.yml` exists for pull requests, it is disconnected from the deployment pipeline, and failures in evaluation do not prevent unverified code from being merged or deployed.

Implementing strict, blocking CI/CD gates will guarantee that:
1. No Cloudflare Workers deployment occurs unless the full evaluation gate (secret scans, TypeScript checks, unit invariants, and agent reasoning evaluations) passes with zero errors.
2. Pull requests targeting `main` execute evaluation gatekeepers as mandatory status checks, failing loudly when prompts, tools, or routing regress.
3. A deliberate prompt regression case is created on a test branch to provide verifiable end-to-end proof that faulty prompts are blocked by the CI/CD gate.

## What Changes

- **Direct Deployment Gating (`deploy-agent.yml`)**:
  - Add an `eval-gate` job as a strict prerequisite (`needs: [eval-gate]`) before the `deploy` job.
  - The `eval-gate` job executes:
    1. Secret hygiene scanner (`bun scripts/check-secrets.ts`).
    2. Full TypeScript workspace typecheck (`bun run check:web`).
    3. Agent unit tests & prompt routing invariant tests (`bun run --cwd apps/agent test`).
    4. Promptfoo evaluation benchmark (`bunx promptfoo eval`).
  - If any step fails, the workflow terminates immediately with a non-zero exit code, leaving Cloudflare Workers untouched.
- **Pull Request Quality Gatekeeper (`agent-eval.yml`)**:
  - Align workflow secrets and dependencies, ensuring `OMP_GATEWAY_KEY` is utilized for gateway-backed evaluation runs.
  - Enforce fail-on-error behavior so evaluation regressions flag the PR check with a failure status (Red X).
- **Failure Verification Scenario (Proof-of-Concept Branch & PR)**:
  - Create a dedicated demonstration branch (`test/failing-eval-gate`) with a deliberate prompt mutation (e.g. instructing the agent to violate currency rules and skip tool calls).
  - Open a Pull Request targeting `main` to prove that CI/CD catches the prompt regression, marks the status check as failed, and prevents automated deployment.

## Capabilities

### New Capabilities
*(None; this change hardens CI/CD pipelines and evaluation gating for existing agent capabilities.)*

### Modified Capabilities
- `agent-eval`: Update the `Pre-Deployment Evaluation Gating in CI/CD` requirement to mandate that the evaluation gate is an enforceable blocker for both pull requests and production deployment jobs.
- `agent-chat/infra`: Update deployment workflow requirements to require successful execution of `eval-gate` prior to triggering `wrangler deploy`.

## Impact

- **Affected Workflows**:
  - `.github/workflows/deploy-agent.yml`
  - `.github/workflows/agent-eval.yml`
- **Security & Reliability**: Guarantees zero regression deployments to Cloudflare Workers edge runtime.
- **Verification**: Verifiable via simulated failing PR in GitHub Actions.
