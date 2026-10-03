# Tasks

## 1. Shared Types Updates

- [x] 1.1 Add `thinking?: string` to `ChatMessage` and `AssistantVariant` interfaces in `packages/shared/src/chat.ts`
- [x] 1.2 Add `contextWindow: number` to `ModelConfig` interface and populate values in `DEFAULT_MODELS` entries (1_000_000 for all three Gemini models)
- [x] 1.3 Remove `'opencode'` from `ModelProvider` type union, remove the OpenCode Spark model from `DEFAULT_MODELS`, leaving exactly 3 Gemini models
- [x] 1.4 Add credit types: `CreditBalance`, `CreditTransaction`, `CreditPricing`, `ContextUsage`, and `StreamFinishMetadata` interfaces; export from `packages/shared/src/index.ts`
- [x] 1.5 Run `bun run check` in `packages/shared` to verify type compilation

## 2. D1 Migration — Credit Schema

- [x] 2.1 Create migration file `apps/agent/db/migrations/0004_credits.sql` with `user_credits`, `credit_transactions`, and `credit_pricing` tables per infra spec; include INSERT seed rows for model pricing
- [x] 2.2 Add `compacted_at INTEGER` and `compaction_summary TEXT` columns to `conversations` table via ALTER TABLE in the same migration
- [x] 2.3 Apply migration locally with `bunx wrangler d1 migrations apply maniyy-agent-db --local` and verify tables exist

## 3. Backend — Credit System

- [x] 3.1 Create `apps/agent/src/db/credits.ts` with `getOrCreateUserCredits`, `deductCredits`, `recordCreditTransaction`, `getCreditPricing`, and `listCreditTransactions` functions
- [x] 3.2 Create `apps/agent/src/routes/credits.ts` Hono router with `GET /api/credits` (balance) and `GET /api/credits/history` (transaction list) endpoints, both authenticated
- [x] 3.3 Register credit routes in `apps/agent/src/index.ts`
- [x] 3.4 Add pre-request credit balance check in `apps/agent/src/routes/chat.ts`: call `getOrCreateUserCredits`, return 402 if balance ≤ 0
- [x] 3.5 Add post-stream credit settlement in both Gemini native and AI SDK paths: calculate credits from actual token usage via `getCreditPricing`, call `deductCredits` and `recordCreditTransaction` inside `waitUntil`
- [x] 3.6 Include `creditsUsed` and `creditsRemaining` in stream finish metadata (`d:` event) for both code paths
- [x] 3.7 Write unit tests for credit calculation logic (deduction math, pricing fallback, balance enforcement) in `apps/agent/src/__tests__/unit/credits.test.ts`

## 4. Backend — Model Cleanup and Defaults

- [x] 4.1 Remove OpenCode Spark model from `AVAILABLE_MODELS` in `apps/agent/src/agent/models.ts`; remove the `opencode` provider branch from `getModel`
- [x] 4.2 Change default model fallback in `apps/agent/src/routes/chat.ts` from `gemini-3.1-flash-lite` to `gemini-3.7-flash`
- [x] 4.3 Add legacy OpenCode conversation fallback: if requested provider is `opencode`, silently route to default model
- [x] 4.4 Add `contextWindow` property to each entry in `AVAILABLE_MODELS`

## 5. Backend — Image Vision Fix

- [x] 5.1 In `apps/agent/src/agent/gemini-native.ts`: add `image` parameter to `runGeminiStream`, construct multipart user message with `inlineData` when image is provided
- [x] 5.2 In `apps/agent/src/routes/chat.ts` Gemini native path: pass `body.image` to the runner
- [x] 5.3 In `apps/agent/src/routes/chat.ts` AI SDK path: inject `{ type: 'image', image: base64Data, mimeType }` into user message content array when `body.image` is present
- [x] 5.4 Add Groq vision auto-fallback: when `body.image` exists and selected model has `capabilities.vision === false`, create `groq('qwen/qwen3.8-27b')` via `createGroq`, route through AI SDK `streamText` with image content, add `X-Model-Fallback` response header
- [x] 5.5 Write unit test verifying image part construction for both Gemini and AI SDK paths

## 6. Backend — Thinking Text Streaming

- [x] 6.1 In `apps/agent/src/agent/gemini-native.ts`: add `thinking_summaries: 'auto'` to chat config; iterate `chunk.candidates[0].content.parts` in stream loop, yield `g:` prefix for parts where `part.thought === true`
- [x] 6.2 In `apps/agent/src/routes/chat.ts` AI SDK path: check for reasoning content in provider metadata after stream, emit `g:` prefix if available
- [x] 6.3 Verify thinking text streams for Gemini 3.7 Flash with thinking level `medium` via manual test (dev server)

## 7. Backend — Conversation Compaction

- [x] 7.1 Create `apps/agent/src/agent/compaction.ts` with `estimateTokens(messages)` (word × 1.3 + 2048/image) and `shouldCompact(estimatedTokens, contextWindow)` (threshold 80%)
- [x] 7.2 Add `compactConversation(db, env, conversationId, messages, contextWindow)` function: selects oldest messages (keeping last 4 turns), calls `gemini-3.1-flash-lite` for summarization via AI SDK `generateText`, stores summary in `compaction_summary` column, sets `compacted_at`
- [x] 7.3 In `apps/agent/src/routes/chat.ts`: after loading history, call `estimateTokens` and trigger `compactConversation` if threshold exceeded; reload compacted history before model call
- [x] 7.4 Update `listMessages` in `apps/agent/src/db/queries.ts` to prepend `compaction_summary` as a system message when `compacted_at` is set, excluding compacted message rows
- [x] 7.5 Include `contextUsage: { usedTokens, maxTokens, percentUsed }` in stream finish metadata

## 8. Frontend — Shared Types and Store Updates

- [x] 8.1 Update `ChatStore.selectedModel` default to `google-antigravity/gemini-3.7-flash` and `thinkingLevel` default to `'medium'`
- [x] 8.2 Add `creditsRemaining`, `lastCreditsUsed`, and `contextUsage` state fields to `ChatStore`
- [x] 8.3 Parse `d:` stream finish event in `executeStream` for `creditsUsed`, `creditsRemaining`, `contextUsage` — update store state
- [x] 8.4 Add `g:` prefix handler in `executeStream` to accumulate `message.thinking` field
- [x] 8.5 Add `loadCredits()` method calling `GET /api/credits` and update `creditsRemaining` on panel open
- [x] 8.6 Sync `AssistantVariant` thinking text on variant switch

## 9. Frontend — ChatBubble Thinking Accordion

- [x] 9.1 Add collapsible `<details>` section in `ChatBubble.svelte` rendering `message.thinking` when present; label "Sedang berpikir..." during stream, "Proses berpikir" after completion
- [x] 9.2 Style thinking section with `border-l-2 border-[#EAEAEA] pl-3 text-xs text-[#787774]` matching minimalist-ui design
- [x] 9.3 Auto-collapse when answer text starts arriving (toggle `open` attribute based on streaming state)

## 10. Frontend — Input Focus Guard

- [x] 10.1 In `ChatInput.svelte` `$effect`: before calling `textareaEl?.focus()`, check `document.activeElement` — skip if active element is an `INPUT`, `TEXTAREA`, or has `contentEditable === 'true'` and is not the chat textarea itself

## 11. Frontend — Credit Gauge and Context Indicator

- [x] 11.1 Create `CreditIndicator.svelte` component: compact inline display showing remaining credits (e.g., "1,847 credits"), positioned near model picker in `ChatPanel.svelte`
- [x] 11.2 Add per-turn cost flash animation: show "-8.3" briefly after stream finish, fade after 3s
- [x] 11.3 Add zero-balance state: disable chat input with "Kredit habis" placeholder, show credit indicator in pale red
- [x] 11.4 Create `ContextGauge.svelte` component: compact progress indicator showing "42% context" near model picker; color shifts at >=70% (pale yellow) and >=90% (pale red)
- [x] 11.5 Add compaction notification: display inline "Riwayat percakapan dirangkum untuk menghemat konteks." message when `contextUsage.percentUsed` drops significantly between turns

## 12. Frontend — Model Picker Cleanup

- [x] 12.1 Remove "OpenCode Zen" category from `ChatModelPicker.svelte`; remove related iconography (Brain/Lightning)
- [x] 12.2 Verify only "Google Antigravity" category renders with 3 models

## 13. Validation

- [x] 13.1 Run `bun run check` across all workspaces (packages/shared, apps/agent, apps/web)
- [x] 13.2 Run `bun test` in `apps/agent` — all existing + new credit tests pass
- [x] 13.3 Deploy to local dev (`bunx wrangler dev` in apps/agent, `bun run dev` in apps/web), verify end-to-end: send message → credits deducted → credit gauge updates → context gauge shows usage
- [x] 13.4 Test image attachment: attach image → send → model receives and describes image content
- [x] 13.5 Test thinking display: select Gemini 3.7 Flash with thinking medium → send complex question → thinking accordion appears, collapses when answer starts
- [x] 13.6 Test input focus guard: open search/amount field → open chat panel → verify cursor stays in search field
- [x] 13.7 Test zero credits: set balance to 0 in local D1 → send message → verify 402 and disabled input
- [x] 13.8 Test compaction: load a long conversation exceeding 80% threshold → verify summary is generated and context gauge drops
