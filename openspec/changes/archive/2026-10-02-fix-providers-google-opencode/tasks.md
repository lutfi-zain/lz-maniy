# Tasks

## 1. Shared Types & Model Registry

- [x] 1.1 Update `packages/shared/src/chat.ts` to remove non-functional OpenCode models from `AVAILABLE_MODELS`, keeping active Gemini and Groq models.
- [x] 1.2 Verify export integrity in `@maniyy/shared` with `bun run check`.

## 2. Backend Model Registry & Legacy Fallback

- [x] 2.1 Update `apps/agent/src/agent/models.ts` to remove OpenCode models from `AVAILABLE_MODELS` and ensure clean fallback for legacy provider lookups.
- [x] 2.2 Verify fallback routing in `apps/agent/src/routes/chat.ts` safely redirects legacy `opencode` requests to default Gemini model.
- [x] 2.3 Update unit test suite in `apps/agent/src/__tests__/unit/models.test.ts` to reflect the active provider list.

## 3. Google Gemini Key Update & Resilience

- [x] 3.1 Update `apps/agent/.dev.vars` with `GEMINI_API_KEY=$GEMINI_API_KEY` and update eval benchmark keys in `eval/run-gemini.ts` and `eval/run.ts`.
- [x] 3.2 Add graceful handling in `apps/agent/src/agent/gemini-native.ts` for upstream 503 high-demand exceptions.
- [x] 3.3 Run backend test suite with `bun test --cwd apps/agent`.

## 4. Frontend Model Picker & Verification

- [x] 4.1 Update `apps/web/src/lib/components/chat/ChatModelPicker.svelte` to remove the OpenCode Zen section and keep Gemini and Groq sections clean.
- [x] 4.2 Update test assertions in `apps/web/tests/chat-reasoning.spec.ts` to verify model picker with active Gemini and Groq models.
- [x] 4.3 Run frontend check and test suite with `bun run --cwd apps/web check` and `bun run --cwd apps/web test:unit`.
