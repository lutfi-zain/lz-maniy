# Proposal

## Why

The agent chat lacks usage control, image understanding is broken (images are sent but never injected into model calls), thinking/reasoning output is invisible to users, input focus steals from active fields, context grows unbounded with no compaction or visibility, and the OpenCode Spark model returns 403 errors because the free tier validates request origin. These gaps make the chat unreliable for financial image analysis, opaque during reasoning, and unsustainable without usage metering.

## What Changes

- **Credit system**: Add per-user credit balance (default 2000 credits = $1 USD at $0.0005/credit), token-based metering on every model call, credit ledger in D1, and pre-request balance enforcement. All models consume credits — no free tier.
- **Credit configuration**: Admin-configurable pricing table per model (input/output rates per 1M tokens), default balance for new users, and credit-to-USD conversion rate stored in D1.
- **Credit monitor**: Return remaining credits and per-turn cost in stream metadata; frontend displays credit gauge in chat panel.
- **Image vision fix**: Inject image parts into both Gemini native runner (`inlineData`) and AI SDK path (`image` content part). Auto-fallback to Groq `qwen/qwen3.8-27b` when the selected model lacks vision capability.
- **Remove OpenCode model**: Remove `opencode-zen/muse-spark-1.3-contributor-free` from `AVAILABLE_MODELS` and `DEFAULT_MODELS`. Change default model to `google-antigravity/gemini-3.7-flash` with thinking level `medium`.
- **Thinking display**: Stream thinking/reasoning text via new SSE prefix `g:`, capture in `ChatMessage.thinking` field, render as collapsible accordion in ChatBubble.
- **Input focus guard**: Check `document.activeElement` before stealing focus — skip when user is in another input/textarea/contentEditable field.
- **Shift+Enter**: Already works (confirmed). No change needed.
- **Conversation compaction**: When estimated token count exceeds 80% of model context window, summarize oldest messages via a model call, replace with summary prefix. Trigger automatically on send.
- **Context usage indicator**: Backend returns `{ usedTokens, maxTokens, percentUsed }` in stream finish metadata. Frontend renders context fullness gauge near model picker.

## Capabilities

### New Capabilities
- `agent-chat/credits`: Per-user credit balance, token-based metering, pricing configuration, credit transaction ledger, and balance enforcement on chat requests.

### Modified Capabilities
- `agent-chat/backend`: Image injection into model calls, thinking text streaming, OpenCode model removal, default model change, compaction logic, credit deduction integration, context usage reporting.
- `agent-chat/frontend`: Thinking accordion in ChatBubble, input focus guard, credit gauge display, context usage indicator, default model/thinking level change.
- `agent-chat/shared-types`: `ChatMessage.thinking` field, credit-related types, context usage metadata types, updated `DEFAULT_MODELS` and `ModelProvider` (remove `opencode`).
- `agent-chat/infra`: New D1 migration for credit tables (`user_credits`, `credit_transactions`, `credit_pricing`).

### Non-Goals
- Top-up / payment integration (credits are granted free for now)
- Per-conversation credit breakdown UI (monitor shows aggregate only)
- Image storage or persistence (images remain ephemeral in-memory)
- Conversation compaction UI controls (auto-triggered only, no manual button)
- Groq model as a user-selectable option (only used as silent vision fallback)
