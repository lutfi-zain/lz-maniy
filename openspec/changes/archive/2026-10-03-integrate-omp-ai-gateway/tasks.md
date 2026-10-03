# Tasks

## 1. Shared Types & Model Catalog

- [x] 1.1 Update `packages/shared/src/chat.ts`: add `'omp'` to `ModelProvider` type union. Replace `DEFAULT_MODELS` with the 4 curated models: `google-antigravity/gemini-3.1-flash-lite`, `google-antigravity/gemini-3.7-flash`, `google-antigravity/gemini-3.8-flash`, and `opencode-zen/muse-spark-1.3-contributor-free`.
  - **Verify**: `cd packages/shared && bun run check` passes with 0 type errors.

- [x] 1.2 Update `apps/web/src/lib/stores/chat.test.ts`: update assertions to expect the 4 curated OMP gateway models.
  - **Verify**: `cd apps/web && bun run test` passes.

## 2. Agent Backend Gateway Integration

- [x] 2.1 Update `apps/agent/src/types.ts`: add optional `OMP_GATEWAY_KEY?: string` and `OMP_GATEWAY_URL?: string` to `Env` interface.
  - **Verify**: `cd apps/agent && bunx tsc --noEmit` passes.

- [x] 2.2 Update `apps/agent/src/agent/models.ts`: add `'omp'` provider case to `getModel()` using `createOpenAI({ name: 'omp', baseURL: env.OMP_GATEWAY_URL || 'https://ai.membran.app/v1', apiKey: env.OMP_GATEWAY_KEY })`. Update `AVAILABLE_MODELS` array to match the 4 curated OMP models.
  - **Verify**: Unit test in `apps/agent` verifies `getModel()` instantiates the OMP provider correctly.

- [x] 2.3 Update `apps/agent/src/routes/chat.ts`: route `'omp'` provider requests directly through Vercel AI SDK `streamText` with `providerOptions: { openai: { reasoningEffort } }` when model supports thinking.
  - **Verify**: `cd apps/agent && bun test` passes.

## 3. Secret & Environment Configuration

- [x] 3.1 Update `apps/agent/.dev.vars` (gitignored): add `OMP_GATEWAY_KEY=sk-omp-7895476876bd366566bfee9f61f8e0b9d616d5a73c1c976d` and `OMP_GATEWAY_URL=https://ai.membran.app/v1`.
  - **Verify**: `git status` confirms `.dev.vars` remains untracked and clean.

- [x] 3.2 Update `apps/agent/wrangler.toml`: add `OMP_GATEWAY_URL = "https://ai.membran.app/v1"` under `[vars]`.
  - **Verify**: Inspect `apps/agent/wrangler.toml` ensuring `OMP_GATEWAY_KEY` is documented in comments for deployment secret.

## 4. Frontend Model Picker Enhancement

- [x] 4.1 Update `apps/web/src/lib/components/chat/ChatModelPicker.svelte`: categorize models into "Google Antigravity" (`google-antigravity/` models) and "OpenCode Zen" (`opencode-zen/` models). Render `<Sparkle>` icon for Google and `<Brain>` icon for OpenCode.
  - **Verify**: `cd apps/web && bun run check` passes with 0 errors.

## 5. Verification & Validation

- [x] 5.1 Run full unit test suite and type check across monorepo: `bun run check` in `packages/shared`, `bun test` & `bunx tsc --noEmit` in `apps/agent`, `bun run test` & `bun run check` in `apps/web`.
  - **Verify**: All tests pass, 0 type errors, 0 regressions.

- [x] 5.2 Execute live integration smoke test against `ai.membran.app`: verify prompt response, tool calling execution, and SSE streaming.
  - **Verify**: Curl or throwaway script against local worker (`wrangler dev`) produces complete SSE stream.
