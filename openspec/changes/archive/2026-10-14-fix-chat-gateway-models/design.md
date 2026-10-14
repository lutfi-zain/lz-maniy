## Context

The agent chat service routes AI completion requests through the OMP AI Gateway at `https://ai.membran.app/v1` via `@ai-sdk/openai`.
Currently, both frontend (`apps/web/src/lib/stores/chat.svelte.ts`) and backend (`apps/agent/src/routes/chat.ts`) default to `google-antigravity/gemini-3.7-flash`. When user chat requests hit the gateway, LiteLLM returns HTTP 404 (`Unknown model: google-antigravity/gemini-3.7-flash`), which Vercel AI SDK catches during `streamText().toDataStream()` and masks into `3:"An error occurred."`.

Live probes against `https://ai.membran.app/v1/chat/completions` confirm that `google-antigravity/gemini-3.8-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-2.5-flash`, and `gemini-2.5-flash-lite` are active and responsive.

## Goals / Non-Goals

**Goals:**
- Make `google-antigravity/gemini-3.8-flash` the universal primary default model across frontend, shared types, and backend worker.
- Clean up `DEFAULT_MODELS` and `AVAILABLE_MODELS` to only include verified, functioning gateway models.
- Implement robust model resolution in `chat.ts`: if the incoming payload requests an unlisted or legacy model (e.g. `gemini-3.7-flash`), automatically fall back to `google-antigravity/gemini-3.8-flash` instead of forwarding an unresolvable ID upstream.
- Improve error handling in the streaming transform: catch upstream API errors and emit clear, diagnostic SSE messages rather than unhelpful generic error strings.

**Non-Goals:**
- Modifying proxy routing or model alias configurations within the remote LiteLLM gateway on `ai.membran.app`.
- Changing financial tool interfaces, system prompts, or credit ledger accounting mechanics.

## Decisions

### 1. Curated Gateway Lineup (5 Models)
We retain only verified models in `AVAILABLE_MODELS` and `DEFAULT_MODELS`:
1. `google-antigravity/gemini-3.8-flash`: Primary Default (High Tier, Vision, Tools, Thinking).
2. `google-antigravity/gemini-3.5-flash-lite`: Fast Mid-tier (Vision, Tools, Thinking).
3. `google-antigravity/gemini-3.1-flash-lite`: Economy / Compaction (Vision, Tools, Thinking).
4. `google-antigravity/gemini-2.5-flash`: Stable General (Vision, Tools, Thinking).
5. `google-antigravity/gemini-2.5-flash-lite`: Lightweight Fallback (Vision, Tools, Thinking).

Removed models:
- `gemini-3.7-flash` (unregistered in gateway)
- `gemini-2.5-pro`, `gemini-3.1-pro`, `gemini-3-pro` (unregistered / 404 in gateway)
- `gemini-3.6-flash`, `gemini-3-flash` (unregistered in gateway)

### 2. Defensive Request Model Resolution in `apps/agent/src/routes/chat.ts`
When processing `POST /api/chat`:
```ts
const DEFAULT_MODEL_ID = 'google-antigravity/gemini-3.8-flash';
let requestedProvider = body.model?.provider ?? 'omp';
let requestedModel = body.model?.model ?? DEFAULT_MODEL_ID;

// Fallback legacy providers or unrouted models
if ((requestedProvider as string) === 'opencode' || requestedModel.includes('3.7-flash')) {
    requestedProvider = 'omp';
    requestedModel = DEFAULT_MODEL_ID;
}

let modelConfig =
    AVAILABLE_MODELS.find((m) => m.provider === requestedProvider && m.model === requestedModel) ??
    AVAILABLE_MODELS.find((m) => m.model === DEFAULT_MODEL_ID) ??
    AVAILABLE_MODELS[0];
```
This guarantees that stale clients or saved browser state with `gemini-3.7-flash` will transparently resolve to `gemini-3.8-flash` without throwing upstream 404s.

### 3. Error Event Handling in `transformDataStream`
In `apps/agent/src/routes/chat.ts`:
If stream generation catches an error from AI SDK or the gateway, unwrap the message and send a user-friendly error frame:
```ts
} catch (err) {
    inferenceSpan?.recordException(err);
    const rawMsg = (err as Error)?.message || String(err);
    const cleanMsg = rawMsg.includes('Unknown model')
        ? 'Model yang dipilih sedang tidak tersedia di gateway. Silakan ganti model atau muat ulang.'
        : rawMsg;
    controller.enqueue(encoder.encode(`3:${JSON.stringify(cleanMsg)}\n`));
}
```

### 4. Svelte 5 Chat Store (`apps/web/src/lib/stores/chat.svelte.ts`)
Update default state initialization:
```ts
selectedModel: ModelConfig = $state(
    DEFAULT_MODELS.find((m) => m.model === 'google-antigravity/gemini-3.8-flash') ?? DEFAULT_MODELS[0]
);
```
Ensure demo conversations and fallback resets also reference `google-antigravity/gemini-3.8-flash`.

## Risks / Trade-offs

- **Risk**: User browsers with existing conversations referencing `gemini-3.7-flash` in localStorage or URL state.
  - *Mitigation*: The backend defensive resolution automatically maps unknown or legacy model IDs to `gemini-3.8-flash` on the fly, preventing session breaking.
- **Risk**: Compaction worker model compatibility.
  - *Mitigation*: `compactConversation` uses `gemini-3.1-flash-lite`, which is verified 200 OK on the gateway.

## Test Strategy

1. **Unit Tests (Agent Worker)**:
   - `apps/agent/src/__tests__/unit/models.test.ts`: Validate that `AVAILABLE_MODELS` contains all 5 curated models and defaults to `gemini-3.8-flash`.
   - `apps/agent/src/__tests__/unit/credits.test.ts`: Verify pricing lookup for `gemini-3.8-flash`.
2. **Unit Tests (Web Store)**:
   - `apps/web/src/lib/stores/chat.test.ts`: Validate default selected model and available models list.
3. **Integration Verification**:
   - Smoke curl to `maniy-agent.lutfidmz.workers.dev/api/chat` with omitted model, deprecated model, and valid model, confirming non-masked streaming success.
