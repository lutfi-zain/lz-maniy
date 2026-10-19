# Technical Design: Blocking CI/CD Gatekeeper & Proof-of-Concept Failure Scenario

## Context

See `proposal.md` for background and motivation.

Currently, `.github/workflows/deploy-agent.yml` triggers on any push to `main` and immediately executes `bunx wrangler deploy` without verifying that the codebase passes unit tests, typechecks, or agent evaluation benchmarks. Meanwhile, `.github/workflows/agent-eval.yml` runs only on `pull_request`, meaning direct pushes or merged changes bypass evaluation. Furthermore, `OMP_GATEWAY_KEY` was previously absent from GitHub Actions secrets, preventing live model evaluations in CI.

## Goals / Non-Goals

**Goals:**
- Unify the Cloudflare Workers deployment pipeline in `.github/workflows/deploy-agent.yml` by introducing a mandatory prerequisite job (`eval-gate`).
- Configure `eval-gate` to execute:
  1. Pre-commit secret credential scan (`bun scripts/check-secrets.ts`).
  2. Full workspace TypeScript check (`bun run check:web`).
  3. Agent unit tests & invariant checks (`bun run --cwd apps/agent test`).
  4. Promptfoo benchmark evaluation with `OMP_GATEWAY_KEY` passed to the runner.
- Enforce `needs: [eval-gate]` on the `deploy` job so Cloudflare Workers deployment is strictly blocked if any evaluation check fails.
- Align `.github/workflows/agent-eval.yml` to run on all pull requests targeting `main`.
- Construct and execute a verifiable failure proof-of-concept on a dedicated test branch (`test/failing-eval-gate`), open a pull request to `main`, and prove that the evaluation gate fails, blocks merging, and prevents deployment.

**Non-Goals:**
- Modifying Cloudflare D1 database migrations or backend MCP routes.
- Modifying web frontend Svelte 5 application code.

## Decisions

### 1. Unified Pipeline Architecture (`deploy-agent.yml`)

The deployment workflow will be restructured into two sequential jobs:

```
  Push to main / Workflow Dispatch
                |
                v
  +-------------------------------------------------------------+
  | Job 1: `eval-gate` (Quality & Accuracy Gatekeeper)           |
  | Runs on: ubuntu-latest                                      |
  | Steps:                                                      |
  |   1. checkout + setup-bun                                   |
  |   2. bun install --frozen-lockfile                          |
  |   3. bun scripts/check-secrets.ts                           |
  |   4. bun run check:web                                      |
  |   5. bun run --cwd apps/agent test                          |
  |   6. bunx promptfoo eval (with OMP_GATEWAY_KEY)             |
  +-------------------------------------------------------------+
                |
         +------+------+
         |             |
     [Passed]       [Failed]
         |             |
         v             v
  +---------------+   +---------------------------------------+
  | Job 2: deploy |   | Pipeline FAILED (Exit Code 1)         |
  | `needs:       |   | - Cloudflare Deploy Aborted           |
  |   eval-gate`  |   | - Workers Runtime Untouched           |
  | - wrangler    |   +---------------------------------------+
  |   deploy      |
  +---------------+
```

### 2. Pull Request Gatekeeper (`agent-eval.yml`)

Ensure `.github/workflows/agent-eval.yml` contains matching steps, environment secrets (`OMP_GATEWAY_KEY`, `OPENAI_BASE_URL: https://ai.membran.app/v1`), and strict exit-code enforcement on PRs targeting `main`.

### 3. Failure Demonstration Strategy (`test/failing-eval-gate`)

To prove that the gatekeeper functions correctly:
1. Create a git branch: `test/failing-eval-gate`.
2. Introduce a deliberate regression in `apps/agent/src/agent/system-prompt.ts`:
   - Corrupt the routing matrix by removing `HEURISTIK PEMILIHAN TOOL FINANSIAL`.
   - Inject forbidden instructions (e.g. forcing dollar `$` output and ordering the agent to ignore tools).
3. Push the branch and open a PR to `main` via `gh pr create`.
4. Observe that GitHub Actions triggers `Evaluate Reasoning & Tool Accuracy`, fails immediately on unit assertions and Promptfoo checks, and reports a Failed Red X status on the PR.
5. Demonstrate that the `deploy` job never ran.
6. Close or restore the demonstration PR.

## Risks / Trade-offs

- **Risk: Slow CI runs on Promptfoo evaluation**: Promptfoo matrix evaluations across multiple models can take several minutes.
  - *Mitigation*: We will configure Promptfoo in CI with `--max-concurrency 2 --no-progress-bar`, and ensure Tier 1 fast checks (vitest, typecheck, secret scan) run first so syntactic or prompt invariant failures fail fast in <20 seconds.
- **Risk: GitHub Free Plan UI Merge Button**: On GitHub Free private repos, server-side branch protection rule locks require Pro/Team.
  - *Mitigation*: While the web UI may not hard-disable the manual override merge button without GitHub Pro, the CI pipeline itself unconditionally halts deployment (`needs: [eval-gate]`), guaranteeing zero production deployment on failure.
