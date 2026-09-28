# Tasks

## 1. Shared Types & Contracts

- [x] 1.1 Update `packages/shared/src/chat.ts` to include `'opencode'` in `ModelConfig.provider`, add `capabilities.thinking`, add `thinkingLevel` to `ChatStreamRequest`, and add `variants` / `activeVariantIndex` to `ChatMessage`.
- [x] 1.2 Run typecheck on `@maniyy/shared` to verify export integrity with `bun run check`.

## 2. Backend OpenCode Adapter & Model Registry

- [x] 2.1 Add `@ai-sdk/openai-compatible` dependency to `apps/agent` via `bun add @ai-sdk/openai-compatible --cwd apps/agent`.
- [x] 2.2 Create `apps/agent/src/agent/opencode-adapter.ts` with custom fetch handler that injects official OpenCode CLI headers (`User-Agent`, `x-opencode-client`, `x-opencode-project`, `x-opencode-session`, `x-opencode-request`) and default `Bearer public` authentication.
- [x] 2.3 Register `opencode` provider and models (`muse-spark-1.3-contributor-free`, `deepseek-v4-flash-free`) with thinking capability in `apps/agent/src/agent/models.ts`.
- [x] 2.4 Add unit test suite in `apps/agent/src/__tests__/unit/opencode-adapter.test.ts` verifying header injection and token resolution, verified with `bun run --filter @maniyy/agent test`.

## 3. Backend Multi-Step Reasoning & History

- [x] 3.1 Refactor while-loop in `apps/agent/src/agent/gemini-native.ts` to stream partial text tokens without terminating the generator prematurely when subsequent tool calls exist.
- [x] 3.2 Inject `priorMessages` conversation history into `createGeminiRunner` and `ai.chats.create` in `apps/agent/src/routes/chat.ts`.
- [x] 3.3 Map `thinkingLevel` in `gemini-native.ts` to `thinkingConfig` (`thinkingBudget` and `thinkingLevel`).
- [x] 3.4 Wire OpenCode provider routing in `apps/agent/src/routes/chat.ts` to handle streaming inference and tool execution via AI SDK.
- [x] 3.5 Run backend unit test suite to verify multi-step streaming and model routing with `bun run --filter @maniyy/agent test`.

## 4. Frontend Chat Store & Variant Management

- [x] 4.1 Update `ChatStore` in `apps/web/src/lib/stores/chat.svelte.ts` to store `thinkingLevel`, transmit it in `sendMessage`, manage `variants` array on assistant messages, implement `retryMessage`, and `switchMessageVariant`.
- [x] 4.2 Add unit tests for `retryMessage` and variant switching in `apps/web/src/lib/stores/chat.test.ts` verified with `bun test apps/web/src/lib/stores/chat.test.ts`.

## 5. Frontend UI Components (Focus, Pager, Thinking)

- [x] 5.1 Implement reactive auto-focus in `apps/web/src/lib/components/chat/ChatInput.svelte` using `$effect` when chat panel is opened on desktop viewports.
- [x] 5.2 Add thinking level selector controls in `apps/web/src/lib/components/chat/ChatModelPicker.svelte` for models with thinking capability.
- [x] 5.3 Implement version pager (`< i / N >`), retry button, and in-bubble error retry trigger in `apps/web/src/lib/components/chat/ChatBubble.svelte`.

## 6. Verification & End-to-End Quality Gates

- [x] 6.1 Execute workspace-wide typechecking via `bun run check`.
- [x] 6.2 Execute full unit test suite via `bun test`.
- [x] 6.3 Create and run Playwright e2e test `apps/web/tests/chat-reasoning.spec.ts` verifying panel open auto-focus, thinking level selection, multi-step generation, and retry version switcher via `bunx playwright test tests/chat-reasoning.spec.ts`.
