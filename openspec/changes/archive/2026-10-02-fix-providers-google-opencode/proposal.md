# Proposal: Fix Provider Errors for Google Gemini & Disable Failing OpenCode Provider

## Why

Upstream provider failures are disrupting AI financial agent functionality in Maniyy V2:
1. Google Gemini requests fail due to an expired API key (`AQ.Ab8RN6IFl5Or...`).
2. The OpenCode Zen provider is broken because the upstream gateway (`https://opencode.ai/zen/v1`) took `deepseek-v4-flash-free` offline (HTTP 400), crashes with HTTP 500 on `muse-spark-1.3-contributor-free`, blocks public-tier requests from outside its official desktop/CLI binary with `403 FreeTierError`, and remaining toy models like `space-bunny-free` hang indefinitely on tool-calling invocations.

Applying the user's new Google GenAI API key and disabling/removing the unreliable OpenCode provider from active selection restores agent reliability immediately, consolidating active model support around Google Gemini and Groq.

## What Changes

- **Google Gemini API Key Update**: Configure the new valid Google GenAI API key (`$GEMINI_API_KEY`) for local runtime (`apps/agent/.dev.vars`) and evaluation scripts (`apps/agent/eval/run-gemini.ts`, `apps/agent/eval/run.ts`).
- **Gemini Default Model Stability**: Ensure `gemini-3.1-flash-lite` is prioritized as the fast, verified active model to prevent unhandled 503 high-demand exceptions on `gemini-3.7-flash` and `gemini-3.8-flash`.
- **Gemini Error Handling Resilience**: Add graceful error messaging in `gemini-native.ts` when Google returns 503 high-demand spike errors.
- **OpenCode Provider Removal**: Remove/disable the OpenCode Zen provider and its broken models from `@maniyy/shared` (`AVAILABLE_MODELS`), `apps/agent/src/agent/models.ts`, and the frontend model picker (`ChatModelPicker.svelte`).
- **Backend Legacy Fallback**: Gracefully reject or redirect any existing conversation configured with `opencode` to the default Gemini model (`gemini-3.1-flash-lite`).

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `agent-chat/backend`: Update Google API key, add 503 resilience in Gemini runner, and disable the `opencode` provider in model routing.
- `agent-chat/shared-types`: Remove OpenCode models from `AVAILABLE_MODELS` in shared types.
- `agent-chat/frontend`: Remove the OpenCode Zen section from `ChatModelPicker.svelte` and synchronize model selection tests.

## Impact

- **Dependencies**: No new external dependencies required; removes runtime reliance on upstream OpenCode gateway.
- **Database/Storage**: No D1 schema migrations required; existing conversation records with `provider: 'opencode'` gracefully fall back to the default Gemini model.
- **Breaking Changes**: None. Disabling non-functional free tier models prevents user-facing 500/403 stream crashes.
