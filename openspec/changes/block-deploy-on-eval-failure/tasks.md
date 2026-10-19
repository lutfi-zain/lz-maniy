## 1. Secrets & Pipeline Configuration

- [x] 1.1 Verify and ensure `OMP_GATEWAY_KEY` secret is available in GitHub Actions repository secrets via `gh secret list`.
- [x] 1.2 Update `.github/workflows/deploy-agent.yml` to introduce an `eval-gate` prerequisite job containing secret scan, typecheck, agent unit tests, and Promptfoo evaluation, enforcing `needs: [eval-gate]` on the `deploy` job.
- [x] 1.3 Update `.github/workflows/agent-eval.yml` to align secrets (`OMP_GATEWAY_KEY`, `OPENAI_BASE_URL`), dependencies, and fail-on-error flags for PR runs.

## 2. Failure Case Creation & Verification on PR
- [x] 2.1 Create a temporary git branch `test/failing-eval-gate` from `main`.
- [x] 2.2 Introduce a deliberate regression in `apps/agent/src/agent/system-prompt.ts` on the test branch (deleting the routing matrix and injecting forbidden dollar currency instructions).
- [x] 2.3 Commit and push the branch, then open a Pull Request to `main` via `gh pr create`.
- [x] 2.4 Observe GitHub Actions: verify that `eval-gate` triggers, fails loudly on the regression, and prevents the Cloudflare Workers deploy job from running.
- [x] 2.5 Close and cleanup the demonstration PR and delete the test branch.

## 3. Verification & Secret Hygiene

- [x] 3.1 Verify clean git working tree on `main` and run `bun scripts/check-secrets.ts`.
- [x] 3.2 Run full agent tests (`bun run test:agent`) and workspace typecheck (`bun run check:web`).
