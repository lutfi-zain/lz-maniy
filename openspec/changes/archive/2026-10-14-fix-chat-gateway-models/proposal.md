# Proposal: Reconcile Chat Models with OMP AI Gateway

## Why

Chat requests using the default model configuration (`google-antigravity/gemini-3.7-flash`) fail with stream error `3:"An error occurred."` because `gemini-3.7-flash` is not registered in the upstream OMP AI Gateway (`ai.membran.app`). The gateway returns HTTP 404 (`Unknown model: google-antigravity/gemini-3.7-flash`), which Vercel AI SDK catches and masks as a generic stream error.

We need to align the agent worker, shared model definitions, and frontend chat store with the active, verified models supported by the upstream gateway, setting `google-antigravity/gemini-3.8-flash` as the reliable primary default and providing graceful fallback.

## What Changes

- **Update Primary Default Model**: Switch default model across frontend (`apps/web`), shared types (`packages/shared`), and backend worker (`apps/agent`) from `google-antigravity/gemini-3.7-flash` to `google-antigravity/gemini-3.8-flash`.
- **Prune Incompatible Models**: Remove non-existent upstream models (`gemini-3.7-flash`, `gemini-2.5-pro`, `gemini-3.1-pro`, `gemini-3.6-flash`) from `AVAILABLE_MODELS` and `DEFAULT_MODELS`.
- **Retain Verified Models**: Keep only models confirmed functional at `https://ai.membran.app/v1`:
  - `google-antigravity/gemini-3.8-flash` (Primary / Default / Reasoning)
  - `google-antigravity/gemini-3.5-flash-lite`
  - `google-antigravity/gemini-3.1-flash-lite` (Fast / Economy)
  - `google-antigravity/gemini-2.5-flash`
  - `google-antigravity/gemini-2.5-flash-lite`
- **Add Gateway Fallback & Error Resilience**: In `apps/agent/src/routes/chat.ts`, if an upstream model throws an `invalid_request_error` (e.g. unknown model), catch and provide a clear descriptive error in the stream rather than opaque masking, with automatic fallback resolution to `gemini-3.8-flash` when the requested model is not found in the verified registry.
- **Update Automated Tests**: Update test suites across `apps/agent`, `apps/web`, and eval fixtures to reflect the verified model list and default model expectations.

## Capabilities

### Modified Capabilities
- `agent-chat/backend`: Update `AVAILABLE_MODELS` and fallback routing in Cloudflare Worker to use verified OMP AI Gateway models with `google-antigravity/gemini-3.8-flash` as default.
- `agent-chat/frontend`: Update `chat.svelte.ts` default model initialization and model picker list to `gemini-3.8-flash`.
- `agent-chat/shared-types`: Update `DEFAULT_MODELS` array in `packages/shared/src/chat.ts` to reflect the pruned verified lineup.

## Impact & Scope Boundaries

### In-Scope
- Alignment of `AVAILABLE_MODELS` and `DEFAULT_MODELS` across web, shared, and agent packages.
- Backend request routing default fallback in `apps/agent/src/routes/chat.ts`.
- Unit tests in `apps/agent/src/__tests__/unit/models.test.ts`, `apps/agent/src/__tests__/unit/credits.test.ts`, and `apps/web/src/lib/stores/chat.test.ts`.

### Non-Goals
- Modifying upstream LiteLLM routing rules on `ai.membran.app` (out of repository scope).
- Adding new tool definitions or altering financial reasoning logic.
