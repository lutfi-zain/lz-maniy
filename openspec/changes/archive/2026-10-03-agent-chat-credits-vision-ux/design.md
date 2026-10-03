# Design

## Context

The agent chat (apps/agent + apps/web + packages/shared) is a Bun monorepo deploying a Cloudflare Worker backend with D1/KV and a SvelteKit SPA frontend. All models currently route through the OMP gateway (`ai.membran.app/v1`) as provider `omp`, with a Gemini native runner for direct Google API calls. The SSE streaming protocol uses numeric prefixes (`0:` text, `9:` tool call, `a:` tool result, `3:` error, `f:` metadata, `e:` step finish, `d:` stream finish). Images are accepted from the frontend but never forwarded to models. No usage tracking, compaction, or thinking display exists. GROQ_API_KEY is already configured as a Cloudflare secret.

## Goals / Non-Goals

**Goals:**
- Meter all model usage via credits with configurable per-model pricing
- Fix image/vision by injecting images into model calls with Groq auto-fallback
- Surface model thinking text in collapsible UI
- Prevent input focus theft from active fields
- Auto-compact long conversations and show context usage
- Remove broken OpenCode model, set reliable defaults

**Non-Goals:**
- Payment/top-up flow (credits granted manually or by default)
- Groq as a user-selectable model (silent fallback only)
- Image persistence in DB (ephemeral in-memory only)
- Manual compaction controls

## Decisions

### D1: Credit unit = $0.0005

**Decision**: 1 credit = $0.0005 USD. Default balance = 2000 credits = $1.00.

**Rationale**: At Gemini 3.7 Flash pricing ($0.75/$3.75 per 1M tokens), a typical tool-assisted turn (~1500 input + 800 output tokens) costs ~8.3 credits. This gives users ~242 tool turns or ~24 full conversations per $1. The number 2000 is user-friendly and the granularity is sufficient to avoid rounding artifacts at the cheapest model tier.

**Alternative considered**: 1 credit = 1 token. Rejected because different models have different per-token costs, requiring a multiplier table that makes "credits" semantically confusing (1 credit ≠ 1 credit across models).

### D2: Post-stream settlement (not pre-hold)

**Decision**: Credit deduction happens after stream completion using actual token counts, not estimated pre-holds.

**Rationale**: Pre-hold requires estimating output token count before generation, which is unreliable. Post-settlement with a simple pre-check (`balance > 0`) is simpler and accurate. The downside — a user at 1 credit can start a request that costs 18 credits, leaving them at -17 — is acceptable because the next request is blocked. No mid-stream abort.

### D3: Groq vision auto-fallback via `@ai-sdk/groq`

**Decision**: When `body.image` is present and the selected model has `capabilities.vision === false`, transparently route to Groq `qwen/qwen3.8-27b` via `createGroq({ apiKey: env.GROQ_API_KEY })` for that single request. The response streams identically.

**Rationale**: All current Gemini models have `vision: true`, so the fallback is future-proofing. Groq's Qwen 3.8 27B supports vision + tool calling + reasoning at $0.80/$4.00 per 1M tokens — comparable to Gemini Flash pricing. Using `@ai-sdk/groq` (already a dependency) keeps the code path consistent with the AI SDK `streamText` flow.

### D4: SSE prefix `g:` for thinking text

**Decision**: Add a new SSE data prefix `g:` carrying JSON-encoded thinking text deltas. The Gemini native runner reads `part.thought === true` from streaming response parts. The OMP gateway path checks for `reasoning` content in AI SDK provider metadata.

**Rationale**: Reusing prefix `0:` would mix thinking and answer text, making it impossible for the frontend to separate them. A dedicated prefix lets the frontend accumulate thinking independently and render it in a collapsible section.

**Protocol extension**:
```
g:{"text":"The user is asking about..."}   // thinking delta
0:"Here is your answer..."                  // answer delta
```

### D5: Compaction via lightweight model call

**Decision**: When estimated tokens exceed 80% of model context window, take the oldest messages (keeping last 4 turns intact), send them to `gemini-3.1-flash-lite` with a summarization prompt, and replace the compacted messages with a `[Conversation Summary]` system-role message. Compacted originals stay in D1 but are excluded from context on subsequent loads.

**Rationale**: Using the cheapest model for summarization minimizes credit cost. Preserving originals in D1 allows export and audit. The 80% threshold leaves room for the current turn's tokens plus the summary. Flash Lite costs ~3 credits for a summarization call (~1000 input, ~200 output).

**Columns added to `conversations`**: `compacted_at INTEGER`, `compaction_summary TEXT`.

### D6: Token estimation = words × 1.3

**Decision**: Estimate tokens as `text.split(/\s+/).length * 1.3` for pre-compaction threshold checks. Images count as 2048 tokens each. Post-stream, use actual `usage.promptTokens` from the model response.

**Rationale**: Word-based estimation is fast and avoids importing a tokenizer. The 1.3 multiplier is a conservative heuristic for English/Indonesian mixed text. Accuracy isn't critical — it only triggers compaction, and actual token counts settle the credit math.

### D7: Context window sizes per model

```
google-antigravity/gemini-3.1-flash-lite  → 1,000,000 tokens
google-antigravity/gemini-3.7-flash       → 1,000,000 tokens
google-antigravity/gemini-3.8-flash       → 1,000,000 tokens
groq/qwen3.8-27b (fallback)              →   131,072 tokens
```

Add `contextWindow: number` to `ModelConfig` in shared types.

### D8: Credit queries module in backend

New module `apps/agent/src/db/credits.ts` with functions:
- `getOrCreateUserCredits(db, userId)` → `{ balance, lifetimeUsed }`
- `deductCredits(db, userId, amount)` → void (atomic UPDATE)
- `recordCreditTransaction(db, { userId, model, inputTokens, outputTokens, creditsUsed, conversationId })` → void
- `getCreditPricing(db, model)` → `{ inputPerMillion, outputPerMillion }` (falls back to 0.75/3.75)
- `listCreditTransactions(db, userId, limit)` → `CreditTransaction[]`

### D9: Frontend credit/context state

Add to `ChatStore`:
- `creditsRemaining = $state<number | null>(null)` — updated from stream finish metadata
- `lastCreditsUsed = $state<number | null>(null)` — fades after 3s
- `contextUsage = $state<ContextUsage | null>(null)` — from stream finish metadata

Parse `d:` stream finish event for `creditsUsed`, `creditsRemaining`, `contextUsage` fields. Add `GET /api/credits` call on panel open to initialize balance.

### D10: Thinking text accumulation in ChatStore

In `executeStream`, when SSE prefix is `g:`, accumulate to a per-message `thinking` string:
```ts
} else if (prefix === 'g') {
    const delta = JSON.parse(payloadStr) as string;
    this.messages = this.messages.map(m =>
        m.id === assistantId
            ? { ...m, thinking: (m.thinking || '') + delta }
            : m
    );
}
```

`ChatBubble` renders `{#if message.thinking}` as a `<details>` element.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| **OMP gateway may not return actual token counts** | Fall back to estimated tokens (word × 1.3) for credit calc if `usage.promptTokens` is undefined. Log a warning for monitoring. |
| **Compaction summary loses nuance** | Keep original messages in D1 for export. Summary prompt instructs: "Preserve key financial figures, wallet names, transaction amounts, and user preferences." |
| **Groq vision fallback changes model quality** | Only triggers when image is attached AND selected model lacks vision. All current models have vision, so this is future-proofing only. When triggered, the response header includes `X-Model-Fallback: groq/qwen3.8-27b` for transparency. |
| **Credit balance race condition** | D1 SQLite is single-writer, so concurrent requests from the same user serialize naturally. Post-settlement deduction is a single atomic UPDATE. |
| **Thinking text availability varies** | Some model calls produce no thinking text (short answers, low thinking level). Frontend handles empty `thinking` gracefully — no accordion rendered. |
| **`Part.thought` field availability in `@google/genai`** | Confirmed present in the installed SDK version (`thought?: boolean` on Part interface). The `chats.create` + `sendMessageStream` path surfaces thought parts in candidates. |
