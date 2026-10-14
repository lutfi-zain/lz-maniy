## 1. Shared Types & Model Constants

- [x] 1.1 Update `packages/shared/src/chat.ts`: prune `DEFAULT_MODELS` to the 5 verified OMP AI Gateway models (`gemini-3.8-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-2.5-flash`, `gemini-2.5-flash-lite`), setting `google-antigravity/gemini-3.8-flash` at index 0.
  - **Verify**: `bun --cwd packages/shared build` or `bun test:web` confirms shared types compile cleanly without missing exports.

## 2. Agent Backend Worker

- [x] 2.1 Update `apps/agent/src/agent/models.ts`: align `AVAILABLE_MODELS` to the 5 verified OMP AI Gateway models and ensure capabilities (vision, tools, thinking) match.
  - **Verify**: `bun --cwd apps/agent test src/__tests__/unit/models.test.ts` compiles.

- [x] 2.2 Update `apps/agent/src/routes/chat.ts`: implement defensive model resolution mapping legacy/deprecated IDs (including `gemini-3.7-flash` and `opencode`) to `google-antigravity/gemini-3.8-flash`.
  - **Verify**: `bun --cwd apps/agent test` passes.

- [x] 2.3 Update `apps/agent/src/routes/chat.ts`: enrich stream error unwrapping in `transformDataStream` to emit clean, actionable error strings on upstream gateway errors.
  - **Verify**: Unit tests and route tests pass.

## 3. Frontend Chat Store

- [x] 3.1 Update `apps/web/src/lib/stores/chat.svelte.ts`: update `selectedModel` initial state to default to `google-antigravity/gemini-3.8-flash`, and update demo conversation mock models.
  - **Verify**: `bun --cwd apps/web test src/lib/stores/chat.test.ts` passes.

## 4. Test Suites & End-to-End Validation

- [x] 4.1 Update and run unit test fixtures:
  - `apps/agent/src/__tests__/unit/models.test.ts`
  - `apps/agent/src/agent/__tests__/models.test.ts`
  - `apps/web/src/lib/stores/chat.test.ts`
  - **Verify**: `bun run test:agent && bun run test:web` both pass with 100% green tests.

- [x] 4.2 Run full workspace type checks and secret scan:
  - **Verify**: `bun run check:web` passes with 0 errors.
  - **Verify**: `bun scripts/check-secrets.ts` passes clean.

- [x] 4.3 Perform live smoke verification:
  - Send test request to `https://maniy-agent.lutfidmz.workers.dev/api/chat` confirming streaming response without `3:"An error occurred."`.
