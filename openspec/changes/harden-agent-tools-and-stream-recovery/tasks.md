## 1. Compact Financial Tool Output DTOs

- [x] 1.1 In `apps/agent/src/agent/tools/financial.ts`, refactor `horizon_projection` to return a compact monthly trajectory DTO (`periodKey`, `startDate`, `endDate`, `cashflow`, `trajectory`, `milestones`), eliminating redundant wallet arrays across periods and bounding payload size under 3KB.
- [x] 1.2 In `apps/agent/src/agent/tools/__tests__/tools.test.ts`, update assertions to verify that `horizon_projection` outputs the compact trajectory DTO and satisfies the payload size budget.

## 2. Defensive Stream Recovery on Function Call Breakdown

- [x] 2.1 In `apps/agent/src/routes/chat.ts`, implement defensive stream recovery: catch `MALFORMED_FUNCTION_CALL` or continuation breakdown when `capturedToolResults` exist, and trigger a single-turn grounded text completion (`toolChoice: 'none'`) over the in-memory tool results.
- [x] 2.2 In `apps/agent/src/__tests__/unit/stream-recovery.test.ts`, add unit tests asserting that provider continuation failures with existing tool results trigger fallback text generation without emitting error chunks.

## 3. Contract-Driven Parameter Integration Testing

- [x] 3.1 In `apps/agent/src/__tests__/integration/reedrich-contract.test.ts`, implement contract-driven validation tests verifying that parameter serialization for all financial tools (`list_transactions`, `financial_summary`, `horizon_projection`, etc.) strictly conforms to ReedRich backend route schemas without synthetic 200 stubs.

## 4. Live Agent Playwright E2E Suite

- [x] 4.1 In `apps/web/tests/e2e/live-chat-turn.spec.ts`, create an end-to-end Playwright test dispatching a multi-month forward projection prompt to the live agent and asserting that the response completes with HTTP 200 and renders clean advice without error banners (`⚠️` or `MALFORMED`).

## 5. Verification, Full Test Suites & Secret Hygiene

- [x] 5.1 Run full unit test suite `bun run test:agent` in `apps/agent`.
- [x] 5.2 Run full web test suites `bun run test:web` and full typecheck `bun run check:web`.
- [x] 5.3 Execute pre-commit secret scanner `bun scripts/check-secrets.ts` to guarantee zero sensitive tokens are staged or committed.
