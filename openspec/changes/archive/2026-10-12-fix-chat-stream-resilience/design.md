# Design: Chat Stream Resilience & Error Surfacing

## Context

See `proposal.md` for problem motivation and background. 

In `apps/web/src/lib/stores/chat.svelte.ts`, `executeStream` manages the raw fetch and Server-Sent Event (SSE) / Data Stream decoding from `${PUBLIC_AGENT_URL}/api/chat`. Other endpoints (e.g., `/api/credits`, `/api/conversations`) use `authFetch`, which provides automatic 401 token refresh retry. However, `executeStream` performs a bare `fetch` without 401 retry, and its `catch` block explicitly checks only for `AbortError`, ignoring all other HTTP or network failures.

## Goals / Non-Goals

**Goals:**
- Provide proactive and reactive 401 token refresh retry inside `executeStream` before failing a stream.
- Convert all stream failures into visible assistant message content with formatted error annotations and retry triggers.
- Disambiguate the loading state in `ChatBubble.svelte` so "Menyusun jawaban..." is never shown when streaming has ended.
- Synchronize Cloudflare Worker secrets and CI/CD environment variables across `maniyy-agent` and `maniy-agent`.

**Non-Goals:**
- Refactoring the underlying Vercel AI SDK or Google GenAI streaming protocols.
- Modifying offline guest demo mock reply logic.

## Decisions

### 1. Two-Tier 401 Recovery Handshake in `executeStream`
Before opening the stream, `executeStream` calls `authStore.getValidToken(PUBLIC_API_URL)`. If the initial `fetch` to `${PUBLIC_AGENT_URL}/api/chat` returns an HTTP 401 and `authStore.refreshToken` is available:
1. `executeStream` will call `await authStore.refreshSession(PUBLIC_API_URL)`.
2. If refresh succeeds, it retries the `fetch` once with the updated `authStore.accessToken`.
3. If refresh fails or no refresh token exists, it throws a dedicated `SessionExpiredError`.

### 2. Comprehensive Error Catching & Content Assignment
In `chatStore.executeStream`:
```ts
} catch (err: unknown) {
    const error = err as Error;
    let fallbackText = '';

    if (error?.name === 'AbortError') {
        fallbackText = 'Koneksi terputus saat menerima jawaban. Silakan coba lagi.';
    } else if (error.message.includes('401') || error.message.includes('SessionExpired')) {
        fallbackText = '⚠️ Sesi login Anda telah berakhir. Silakan login kembali untuk melanjutkan.';
    } else if (error.message.includes('402')) {
        fallbackText = '⚠️ Saldo kredit Anda habis. Silakan hubungi admin atau perbarui paket.';
    } else {
        fallbackText = `⚠️ Terjadi kendala teknis saat menerima jawaban: ${error.message || 'Koneksi gagal'}.`;
    }

    this.messages = this.messages.map((m) =>
        m.id === assistantId
            ? this.syncActiveVariant({
                    ...m,
                    content: m.content ? `${m.content}\n\n${fallbackText}` : fallbackText
                })
            : m
    );
} finally {
    this.isStreaming = false;
    this.abortController = null;
    ...
}
```

### 3. ChatBubble Disambiguation
In `apps/web/src/lib/components/chat/ChatBubble.svelte`:
```svelte
{#if uiCommand}
    <ChatUICommandCard command={uiCommand} />
{:else if message.content}
    <MarkdownContent content={message.content} />
{:else if chatStore.isStreaming}
    <div class="flex items-center gap-1.5 py-1 text-xs text-[#787774]">
        <span class="inline-block size-2 animate-pulse rounded-full bg-[#111111]"></span>
        <span class="font-medium">Menyusun jawaban...</span>
    </div>
{:else}
    <div class="flex items-center justify-between gap-3 py-1 text-xs text-[#9F2F2D]">
        <span>⚠️ Jawaban tidak dapat dimuat.</span>
        <button
            class="underline hover:text-[#111111] font-medium cursor-pointer"
            onclick={() => chatStore.retryMessage(message.id)}
        >
            Coba lagi
        </button>
    </div>
{/if}
```

### 4. Cloudflare Worker Secrets & CI/CD Alignment
1. Mirror secrets (`OMP_GATEWAY_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`) to `maniy-agent` via Wrangler.
2. In `.github/workflows/deploy-web.yml`, update default `PUBLIC_AGENT_URL` to `https://maniy-agent.lutfidmz.workers.dev` while maintaining fallback compatibility.

## Risks / Trade-offs

- **Concurrent Stream Submissions**: A rapid token refresh retry might delay the first token emission by 200–500ms; mitigated by keeping `isStreaming = true` during the retry attempt.
- **Worker Environment Duplication**: While both workers exist during transition, secrets must be present on both `maniyy-agent` and `maniy-agent` to avoid any breaking cutover period.
