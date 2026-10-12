# Tasks: Fix Chat Stream Resilience & Error Surfacing

## 1. Chat Store Resilience & Auto-Refresh

- [x] 1.1 Implement 401 token refresh and retry handshake in `chatStore.executeStream` (`apps/web/src/lib/stores/chat.svelte.ts`)
- [x] 1.2 Expand error catching in `executeStream` to format error details (401 session expired, 402 out of credits, 500 server error, network drop) and assign them to `message.content`
- [x] 1.3 Add Vitest unit tests in `apps/web/src/lib/stores/chat.test.ts` proving that non-abort errors surface to `message.content` and 401 triggers token refresh retry

## 2. Chat Bubble UI Disambiguation

- [x] 2.1 Restrict "Menyusun jawaban..." pulsating indicator in `apps/web/src/lib/components/chat/ChatBubble.svelte` strictly to active streaming (`chatStore.isStreaming && !message.content`)
- [x] 2.2 Render fallback error card with a "Coba lagi" retry button in `ChatBubble.svelte` when streaming has terminated and content remains empty
- [x] 2.3 Verify type-checking and web unit tests with `bun run check:web` and `bun run test:web`

## 3. Worker Environment & Secrets Synchronization

- [x] 3.1 Mirror production secrets (`OMP_GATEWAY_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`) to Cloudflare Worker `maniy-agent`
- [x] 3.2 Update `.github/workflows/deploy-web.yml` to set default `PUBLIC_AGENT_URL` to `https://maniy-agent.lutfidmz.workers.dev`
- [x] 3.3 Verify full suite passes with `bun run test:agent` and secret scanner `bun scripts/check-secrets.ts`
