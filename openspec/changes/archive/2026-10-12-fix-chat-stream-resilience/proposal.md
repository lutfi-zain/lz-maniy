# Proposal: Fix Chat Stream Resilience & Error Surfacing

## Why

When chatting with the AI financial agent, sending any prompt (e.g. "hi") currently results in an infinite "Menyusun jawaban..." loading spinner whenever an HTTP error (401 token expired, 402 out of credits, 500 worker failure) or network failure occurs. 

This happens because `chatStore.executeStream` silently catches and discards all non-abort errors without updating `message.content`, while `ChatBubble.svelte` renders the pulsating "Menyusun jawaban..." state whenever `content` is empty. Furthermore, `executeStream` lacks the automatic 401 OAuth token refresh and retry loop present in other stores, so any user session older than 15 minutes fails silently on chat execution. Lastly, the recent rebrand from `maniyy-agent` to `maniy-agent` created worker and secret alignment drift across CI/CD and deployment targets.

## What Changes

- **Graceful Stream Error Surfacing**: Update `chatStore.executeStream` catch block to capture all exceptions (HTTP 4xx/5xx, NetworkError, JSON parse errors), assign formatted warning/error messages (e.g. `⚠️ Sesi berakhir. Silakan login kembali.` or `⚠️ Gagal terhubung ke agent: HTTP 401`) directly into the assistant message variant content, and toggle `isStreaming = false`.
- **Automatic 401 Token Refresh & Retry**: Integrate `authStore.getValidToken()` and a 401 refresh-retry mechanism inside `executeStream` before failing, mirroring the pattern in `reedrichStore`.
- **ChatBubble State Disambiguation**: Update `ChatBubble.svelte` so that "Menyusun jawaban..." is strictly displayed while `chatStore.isStreaming` is active. If streaming has ended and `content` is empty or failed, display a distinct error fallback card with a "Coba Lagi" (retry) trigger.
- **Worker & Secrets Alignment**: Ensure Cloudflare Worker secrets (`OMP_GATEWAY_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`) are synchronized to `maniy-agent`, and reconcile `PUBLIC_AGENT_URL` across `.github/workflows/deploy-web.yml` and client configurations.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `agent-chat/frontend`: Add requirements for error message propagation during streaming, 401 session token refresh recovery, and terminal error state rendering in chat bubbles when streaming ends with empty content.
- `auth-session`: Add requirements ensuring token expiration recovery is supported across all streaming RPC connections.

## Impact

- **Frontend (`apps/web`)**: `apps/web/src/lib/stores/chat.svelte.ts`, `apps/web/src/lib/components/chat/ChatBubble.svelte`, `apps/web/src/lib/stores/chat.test.ts`.
- **Infrastructure & CI/CD**: `.github/workflows/deploy-web.yml`, `apps/agent/wrangler.toml`, Cloudflare Worker secrets.
- **No Breaking API Changes**: Fully backward compatible with existing Reedrich REST and SSE streaming protocols.
