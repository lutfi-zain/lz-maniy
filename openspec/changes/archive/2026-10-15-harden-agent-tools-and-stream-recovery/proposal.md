## Why

When users ask long-horizon forward projections or multi-tool queries (e.g. simulating a car purchase with 50 million DP next year), financial tools currently return uncompressed, deeply nested database dumps (>30KB for `horizon_projection` repeating wallet and goal trees across 14+ periods). This context bloat causes upstream Google Gemini models to encounter attention degradation and fail with `MALFORMED_FUNCTION_CALL`. Furthermore, existing unit tests rely on mock fetch stubs that fail to catch schema contract drift against ReedRich backend APIs, and the agent streaming pipeline lacks a defensive recovery fallback when model continuation fails after tools have already collected the required financial data.

## What Changes

- **Compact Tool Output DTOs (Payload Budget <3KB)**: Refactor `horizon_projection` and financial tool return shapes in `apps/agent/src/agent/tools/financial.ts` to omit redundant wallet arrays duplicated across periods, returning clean, focused monthly cashflow trajectories (`periodKey`, `netSpendable`, `spendableNetWorth`, `lockedNetWorth`, `milestonesReached`), slashing tool output size by ~85%.
- **Defensive Stream Recovery on Function Call Breakdown**: In `apps/agent/src/routes/chat.ts`, implement an automatic fallback synthesis step: if the model fails with `MALFORMED_FUNCTION_CALL` or unhandled continuation error after Step 1 tools have already succeeded, execute a single-turn text completion (`toolChoice: 'none'`) grounding the answer on the in-memory tool results rather than terminating the user stream with a technical error.
- **Contract-Driven Tool Schema Integration Tests**: Add `apps/agent/src/__tests__/integration/reedrich-contract.test.ts` to validate that all tool parameter mappers (`orderBy`, `direction`, `startDate`, `endDate`, `status`, `isPlanned`) match ReedRich MCP route validators without synthetic mock stubs.
- **End-to-End Live Agent Pipeline Smoke Suite**: Add Playwright integration test `apps/web/tests/e2e/live-chat-turn.spec.ts` executing realistic multi-turn financial simulations and asserting that the assistant stream completes with status 200 without emitting developer error banners (`⚠️` or `MALFORMED`).

## Capabilities

### New Capabilities
<!-- None: this change extends existing agent-chat/backend capabilities. -->

### Modified Capabilities
- `agent-chat/backend`: Enforce compact tool output contracts, defensive continuation recovery for multi-step tool execution, and contract-driven verification against the ReedRich API.

## Impact

- **Affected Systems**: `apps/agent/src/agent/tools/financial.ts`, `apps/agent/src/routes/chat.ts`, `apps/agent/src/__tests__/integration/` (new), `apps/web/tests/e2e/live-chat-turn.spec.ts` (new).
- **Dependencies**: No new external npm packages required; uses existing Vercel AI SDK and Vitest/Playwright test runners.
- **Breaking Changes**: None. Backwards compatible with existing chat streaming and storage protocols.
