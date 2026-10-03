# Proposal

## Why

Direct upstream Google Gemini and Groq API connections suffer from strict free-tier rate limits (15 RPM), absence of automated credential rotation, and reliance on personal API keys. The OMP Auth Gateway (`https://ai.membran.app/v1`) provides a forward-proxy AI gateway with background OAuth token rotation and standard OpenAI wire-format completions. Integrating the OMP gateway as the unified provider for Eve eliminates rate-limit bottlenecks and provides reliable access to Google Antigravity Gemini and OpenCode models.

## What Changes

- **Add OMP Gateway Provider**: Implement an `'omp'` provider in `apps/agent` using `@ai-sdk/openai` targeting `OMP_GATEWAY_URL` (`https://ai.membran.app/v1`) authenticated via `OMP_GATEWAY_KEY`.
- **Curate Model Lineup**: Restrict the available models exclusively to:
  - `google-antigravity/gemini-3.1-flash-lite` (Default / Fast)
  - `google-antigravity/gemini-3.7-flash` (Reasoning & Tools)
  - `google-antigravity/gemini-3.8-flash` (High Tier)
  - `opencode-zen/muse-spark-1.3-contributor-free` (OpenCode Spark 1.3 Free)
- **Deprecate Legacy Direct Providers**: Remove direct Groq and direct Gemini configurations from the default user-facing selection while preserving the underlying tool calling and SSE streaming infrastructure.
- **Update Frontend Model Picker**: Refactor `ChatModelPicker.svelte` dropdown to organize models under "Google Antigravity (Gemini)" and "OpenCode Zen" sections with appropriate icons and reasoning badges.
- **Secure Credential Hygiene**: Ensure `OMP_GATEWAY_KEY` is loaded strictly from environment bindings (`.dev.vars` locally and Cloudflare Worker secrets in production), with zero plaintext secrets committed to Git.

## Capabilities

### Modified Capabilities

- `agent-chat/backend`: Add `'omp'` provider routing via `@ai-sdk/openai` to `OMP_GATEWAY_URL` with full SSE data streaming and multi-step tool execution.
- `agent-chat/shared-types`: Update `ModelProvider` type to include `'omp'`, and configure `DEFAULT_MODELS` to contain only the 4 curated OMP gateway models.
- `agent-chat/frontend`: Update `ChatModelPicker.svelte` to group and display the OMP gateway models cleanly.

## Non-Goals

- Modifying the upstream OMP Auth Gateway VPS service, Cloudflare Tunnel, or credential broker.
- Re-enabling non-Gemini models from Google Antigravity (e.g. Claude Opus/Sonnet via OMP) or other OpenCode models.
- Changing the existing Reedrich financial tools or database schemas.
