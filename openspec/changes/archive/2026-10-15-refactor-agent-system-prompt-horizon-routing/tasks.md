## 1. Tool Description & Parameter Discriminability

- [x] 1.1 Update `horizon_projection` tool description and parameter docstrings in `apps/agent/src/agent/tools/financial.ts` with explicit temporal scope (2 to 24 months), milestone tracking capabilities, and negative constraints against single-transaction lookups. Verify with `bun run test:agent apps/agent/src/agent/tools/__tests__/tools.test.ts`.
- [x] 1.2 Verify contract compliance and parameter boundary limits in `apps/agent/src/__tests__/integration/reedrich-contract.test.ts` via `bun test apps/agent/src/__tests__/integration/reedrich-contract.test.ts`.

## 2. System Prompt Refactoring (Context Engineering & Decision Matrix)

- [x] 2.1 Refactor `apps/agent/src/agent/system-prompt.ts`: Remove the redundant text catalog `buildToolCatalog()` and replace it with `buildToolRoutingMatrix()`, establishing high-signal temporal horizon dispatch (T = 0 Real-time, T < 0 Historical Audit, T + 1 Month Micro-Plan, and T > 1 to 24 Months Macro Horizon).
- [x] 2.2 Update `buildBehaviorProtocol()` in `apps/agent/src/agent/system-prompt.ts`: Replace manual multi-step arithmetic instructions with dual-path guidelines directing single-month micro-plans to `get_snapshot` + `list_transactions(planned)` and multi-month runway/milestone forecasting strictly to `horizon_projection`.
- [x] 2.3 Update `buildAccountingPrinciples()` in `apps/agent/src/agent/system-prompt.ts`: Eliminate instructions directing the model to manually calculate multi-month totals in text, reaffirming that forward multi-month trajectories are calculated deterministically by the edge engine.
- [x] 2.4 Update `buildCommunicationStyle()` in `apps/agent/src/agent/system-prompt.ts`: Embed a standardized Markdown trajectory table format for presenting horizon projections (Month, Planned Income, Planned Expense, Net Spendable Cash, Spendable Net Worth Runway, Milestone Status).

## 3. Unit & Integration Testing

- [x] 3.1 Update unit tests in `apps/agent/src/agent/__tests__/system-prompt.test.ts` and `apps/agent/src/__tests__/unit/system-prompt.test.ts` to validate the new `buildToolRoutingMatrix()`, verify prompt size reduction, and ensure all temporal rules are preserved. Verify via `bun test apps/agent/src/agent/__tests__/system-prompt.test.ts apps/agent/src/__tests__/unit/system-prompt.test.ts`.
- [x] 3.2 Update evaluation assertion in `apps/agent/eval/promptfoo-tests.yaml` (TC-35) to require `horizon_projection` invocation on the laptop horizon check scenario.
- [x] 3.3 Execute the full agent test suite via `bun run test:agent` to prove zero regressions across agent routes, tools, and stream recovery.

## 4. Verification & Secret Hygiene

- [x] 4.1 Run full TypeScript type checking across the workspace via `bun run check:web`.
- [x] 4.2 Run pre-commit secret scan via `bun scripts/check-secrets.ts` and verify 0 findings.
