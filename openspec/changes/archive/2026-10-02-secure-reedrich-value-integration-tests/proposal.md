# Proposal

## Why

Financial CRUD is specified but the inspected browser CRUD suites mostly stop at drawer/form interactions; they do not prove persisted mutations or that balances, budgets, goals, historical views, and forecasts agree with an independent calculation. Credential-looking values also exist in source, evaluation scripts, OpenSpec documents, and reachable Git history, while an unused goal-contribution client still targets an endpoint absent from the current Reedrich contract.

## What Changes

### Phase 1 — Credential containment and Git history sanitation

- Move all real credentials to ignored private environment files, CI secret bindings, or existing provider secret stores. Remove shared personal-account authentication from Playwright configuration and remove the `PUBLIC_API_TOKEN`/`DEFAULT_TOKEN` build-time credential fallback; browser test authentication is injected only at runtime.
- Cover web tests/configuration, both `apps/agent/eval` runners, durable specs, and archived change documents. Read-only discovery found five distinct credential-looking values across the observed Reedrich, Google, and Groq formats; their validity was not checked.
- Revoke/rotate exposed values before relying on history cleanup. Add redacted working-tree/history secret checks and a CI gate; do not place replacement values or a filter replacement map in tracked files, command-line arguments, or reports.
- **BREAKING:** use the user-selected `git-filter-repo` to sanitize affected reachable history and reset consumers to the rewritten commit graph while preserving legitimate source changes. Commit IDs change; this is not a squash to a new initial commit. Coordinate branches, remote refs, old clones, reflogs, and caches; remote publication and destructive clone reset require separate execution approval. No automatic force push or merge of the old graph.

### Phase 2 — Remove the retired contribution contract

- Remove `ReedrichStore.contributeToGoal`, its import, `ContributeGoalPayload`, and its mocked forwarding test. LSP found only the definition and one unit-test caller, not a UI consumer.
- **BREAKING:** retire the public contribution method/type and the corresponding `entity-crud` requirement, detail-action promise, reconciliation wording, and contribution-based E2E scenario. Do not add an alias, fake implementation, or a replacement contribution endpoint.
- Keep supported manual stored-balance editing for unlinked goals; the requested financial test fixture uses linked wallets only. Money movement is recorded as transactions/transfers, and goal progress is derived from linked wallet balances.
- Correct the recurring realization requirement: creation materializes planned occurrences; `apply` realizes an existing occurrence in place. Keep the supported realization feature, but never use it to populate forecast setup.

### Phase 3 — Value-validated integration and browser E2E

- Use the existing Playwright dependency and `APIRequestContext` for real API integration and UI journeys under one exclusive TestBot fixture owner. Keep deterministic Vitest formula/state tests offline; do not distribute dependent fixture phases between runners or files.
- Require private credentials, expected TestBot identity, explicit target/destructive-run authorization, and successful preflight before any wipe. Clean all mutable financial entities before setup, retaining protected system categories and the user identity.
- Exercise actual UI create/read/update for wallets, categories, transactions/transfers, budgets, goals, and recurring templates. Verify persistence with authenticated API reads and validate mutation deltas, not just enabled buttons or request strings.
- Validate every existing numeric surface on Cockpit, Category Studio, Ledger list/Horizon, Accounts list/Horizon, and Planning goals/budgets against a hand-calculated IDR fixture and an independent expected-value journal.
- Seed nonzero historical transactions for two prior months and planned salary, expenses, and savings transfers for each of the next three months. Assert opening/movement/closing balances per wallet, economic cashflow, linked goal amounts, monthly percentage-point increases, remaining target, and the pacing actually displayed by the FE.
- Preserve all fixture data until numeric, historical, forecast, filter, and responsive assertions complete. Then exercise UI Delete with API absence/balance-reversal checks. A separate `afterAll` fallback performs dependency-aware cleanup even after failure or partial setup; wallet deletion uses `PATCH balance: 0` after links are removed.
- Add targeted boundary cases for fees/transfers, date edges, status transitions, over-budget/headroom, goal milestones, pagination, and failed/empty data. Existing incidental wording/style/forwarding tests in touched suites are removed rather than re-pinned.

## Capabilities

### New Capabilities

- `credential-hygiene`: private credential sourcing, exposure containment, redacted scanning, and coordinated `git-filter-repo` history/clone cutover.
- `financial-value-testing`: independent financial oracles, single-owner live test lifecycle, cross-surface numeric assertions, historical reconstruction, and three-month forecasts.

### Modified Capabilities

- `entity-crud`: retire manual contribution endpoint behavior, align recurring occurrence realization, strengthen goal lifecycle tests, and enforce pre-clean/late-delete/final-clean test isolation without mocked-forwarding coverage requirements.
- `agent-chat/infra`: replace the embedded dedicated-test credential example with private runtime configuration and guarded test-account identity verification; keep offline Worker integration tests independent of live credentials.
- `financial-store`: clarify that date-bounded account overview cashflow/budget selection is distinct from live capital; historical wallet capital uses point-in-time wallet snapshots. This reconciles the stale snapshot-balance promise with the current Reedrich contract without changing accounting rules.

## Impact

- Source targets: `apps/web/src/lib/stores/{mock-data.ts,reedrich.svelte.ts,reedrich-crud.test.ts}`, `packages/shared/src/account-detail.ts`, `apps/agent/eval/{run.ts,run-gemini.ts}`, web Playwright specs/configuration, environment examples, and CI workflows. Historical secret-bearing OpenSpec files are sanitation targets during apply, not copied into new artifacts.
- Test targets: the existing route/component hierarchy is retained. New live tests use existing drawers and view controls; minimal stable entity/period locators may be added without redesign. Existing finance math tests remain useful and do not count as live integration proof.
- External system: Reedrich's current `llms.txt` and OpenAPI `1.17.0` contract. Authenticated production calls, credential validity checks, data cleanup, Git rewriting/publication, and installations are not performed by this proposal.
- Tool prerequisite: `git-filter-repo` is not installed on this machine. Installing it, and a secret scanner if needed, requires approval during implementation; no runtime/package dependency is added by planning.
- Non-goals: rebuilding Reedrich, changing accounting rules to match a failing display, adding a goal-contribution substitute, redesigning screens, resetting personal data, expanding debt/profile feature CRUD, or discarding legitimate commit history. Debt/loan records are included in account cleanup and empty-obligation assertions, not a new debt-management UI.
