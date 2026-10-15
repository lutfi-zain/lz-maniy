## Why

When an agent turn encounters an upstream error or stream interruption before saving an assistant reply, the user's message remains in the database as an orphaned trailing user turn. Subsequent messages or retries in that conversation send consecutive `user` roles to the Gemini API, causing immediate HTTP 400 failures (`Please ensure that multiturn requests alternate between user and model roles`) and permanently freezing the conversation. Additionally, the existing defensive stream recovery fails in production because `capturedToolResults` is populated only in `onFinish`, which executes after stream error events or remains empty during stream aborts.

## What Changes

- **In-Memory History Alternation Sanitizer**: Sanitize `priorMessages` in `apps/agent/src/routes/chat.ts` before passing them to the AI SDK / Gemini model. If the previous conversation ended with an unresponded `user` turn, fold or prune the dangling turn from the model payload so that the prompt strictly alternates roles (`user` → `assistant` → `user`), while preserving 100% of user messages in the D1 database for history viewing.
- **Real-Time Tool Execution Capture**: Populate `capturedToolResults` synchronously as each tool resolves in Step 1, rather than waiting for the terminal `onFinish` callback. This guarantees that `capturedToolResults` is populated before Step 2 begins.
- **Instant Defensive Fallback Synthesis**: When a stream error (such as `MALFORMED_FUNCTION_CALL` or abrupt provider disconnect) occurs, trigger `attemptFallbackSynthesis` using the pre-captured tool results to yield a clean Indonesian markdown answer rather than surfacing raw error banners or freezing the UI.
- **Contract & Recovery Test Suite**: Add comprehensive unit tests verifying that multi-turn history with consecutive user turns is sanitized safely, and that real-time tool results survive stream aborts to drive fallback synthesis.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `agent-chat/backend`: Add requirements for multi-turn role alternation sanitization and real-time tool execution capture for defensive fallback recovery.
