## 1. Fix Gemini Native Runner Token Counts & Credit Settlement

- [x] 1.1 In `apps/agent/src/agent/gemini-native.ts`, add mutable `totalPromptTokens` and `totalCompletionTokens` variables inside `runGeminiStream`. After `chat.sendMessage()` (line 115), extract `response.usageMetadata.promptTokenCount` and `response.usageMetadata.candidatesTokenCount` and accumulate. After each `chat.sendMessageStream()` loop, extract the final chunk's cumulative `usageMetadata` and accumulate. **Verify**: Log token counts in dev; they differ from hardcoded 100/100.
- [x] 1.2 Accept `settleCredits` callback as a parameter of `createGeminiRunner` (or pass `db` + `userId` + pricing functions). Before yielding the final `d:` event in `runGeminiStream`, call `settleCredits(totalPromptTokens, totalCompletionTokens)` and include `creditsUsed` and `creditsRemaining` in the `d:` JSON payload. Replace all hardcoded `{"promptTokens":100,"completionTokens":100}` with accumulated values. **Verify**: `d:` event in Gemini stream contains `creditsUsed` and `creditsRemaining` fields.
- [x] 1.3 Update `apps/agent/src/routes/chat.ts` Gemini path (lines 162-231) to pass `settleCredits` to `createGeminiRunner` and remove the duplicate `waitUntil` credit settlement for the Gemini path. **Verify**: No duplicate credit deduction; `credit_transactions` table shows one row per Gemini chat turn.

## 2. Fix AI SDK Path Credit Metadata in SSE Stream

- [x] 2.1 In `apps/agent/src/routes/chat.ts` AI SDK path (lines 282-319), inject credit metadata into the SSE stream. Investigate using Vercel AI SDK `StreamData` to append `{ creditsUsed, creditsRemaining }` from the `onFinish` callback. If `StreamData` is unavailable in the installed version, emit a custom `d:` event with credit data as part of the `toDataStreamResponse` options. **Verify**: AI SDK path `d:` finish event contains `creditsUsed` and `creditsRemaining`.
- [x] 2.2 Verify the AI SDK `onFinish` callback's `ev.usage.promptTokens` and `ev.usage.completionTokens` are populated by the OMP gateway provider (not `undefined`). If undefined, fall back to `estimateTokens(history)` and word-count estimation as currently done (line 307-309). **Verify**: Token counts in `credit_transactions` are non-zero for AI SDK path.

## 3. Frontend Credit Balance Refresh

- [x] 3.1 In `apps/web/src/lib/stores/chat.svelte.ts`, add `this.loadCredits()` call in the `finally` block of `executeStream` (after line 673) as a safety-net refetch. Guard with a flag: skip if `creditsRemaining` was already updated from a `d:` event during this stream. **Verify**: `CreditIndicator` updates after each chat turn even if `d:` event lacks credit data.
- [x] 3.2 Update `CreditIndicator.svelte` to animate the credit change (brief flash/highlight) when balance decreases. **Verify**: Visual feedback visible on credit deduction.

## 4. Expand Model Registry to 12 Gemini Models

- [x] 4.1 Update `apps/agent/src/agent/models.ts`: replace `AVAILABLE_MODELS` with 12 google-antigravity Gemini model entries per design.md D3 table. Each entry: `provider: 'omp'`, `model: 'google-antigravity/<id>'`, `displayName`, `capabilities: { vision: true, tool_calling: true, thinking: true }`, `thinkingLevels` per model, `contextWindow: 1_000_000`. **Verify**: `AVAILABLE_MODELS.length === 12`.
- [x] 4.2 Update `packages/shared/src/chat.ts`: replace `DEFAULT_MODELS` with the same 12 entries matching `AVAILABLE_MODELS`. **Verify**: `bun run check` passes in `packages/shared`.
- [x] 4.3 Update `apps/agent/src/__tests__/unit/models.test.ts` and `apps/agent/src/agent/__tests__/models.test.ts`: assert `AVAILABLE_MODELS.length === 12`, verify all 12 model IDs present, verify each has required fields. **Verify**: `bun test` passes in `apps/agent`.

## 5. Credit Pricing Migration for New Models

- [x] 5.1 Create `apps/agent/db/migrations/0005_expand_credit_pricing.sql` with `INSERT OR IGNORE` rows for all 9 new Gemini models (existing 3 + groq already seeded in 0004). Pricing tiers: Lite ($0.25/$1.50), Flash ($0.75/$3.75), Pro ($1.25/$5.00) per 1M tokens. **Verify**: `bunx wrangler d1 migrations apply maniyy-agent-db --local` succeeds; `SELECT count(*) FROM credit_pricing` returns 13 (12 Gemini + 1 Groq).
- [x] 5.2 Verify `getCreditPricing()` returns correct tier-specific pricing for a pro model (`gemini-2.5-pro`) instead of fallback pricing. **Verify**: Unit test or manual query returns `inputPerMillion: 1.25`.

## 6. Frontend Model Picker Tier Grouping

- [x] 6.1 Update `apps/web/src/lib/components/chat/ChatModelPicker.svelte`: add derived arrays `liteModels`, `flashModels`, `proModels` based on model ID suffix patterns (`-lite` → Lite, `-pro` → Pro, rest → Flash). Render three labeled sections in the dropdown: Lite, Flash, Pro. **Verify**: Dropdown shows 12 models grouped under 3 tier headers.
- [x] 6.2 Persist selected model to `localStorage` in `chatStore.setModel()` and restore on `ChatStore` initialization. **Verify**: Selected model survives page refresh.

## 7. Promptfoo Integration & Custom Provider

- [x] 7.1 Run `cd apps/agent && bun add -D promptfoo` to add Promptfoo as a dev dependency. **Verify**: `bunx promptfoo --version` outputs a version number.
- [x] 7.2 Create `apps/agent/eval/provider.ts`: custom Promptfoo provider that imports `buildSystemPrompt`, all tool factories, `getModel`; accepts `config.model` from Promptfoo config; calls `streamText` with full tool set and `maxSteps: 10`; collects steps, tool calls, and final text; returns `{ output: finalText + toolCallSummary }`. **Verify**: `bun run apps/agent/eval/provider.ts` does not throw import errors.
- [x] 7.3 Create `apps/agent/eval/promptfooconfig.yaml` with 3 provider entries (gemini-3.7-flash, gemini-3.8-flash, gemini-2.5-pro via `file://provider.ts`), `maxConcurrency: 2`, and `tests: file://promptfoo-tests.yaml`. **Verify**: Config parses without error via `bunx promptfoo eval --dry-run`.

## 8. Eval Dataset Expansion from Telegram Export

- [x] 8.1 Expand `apps/agent/eval/dataset.ts` from 9 to 32+ test cases. Add all 23 curated use cases from the Telegram session analysis organized by category: `balance_query` (4), `transaction_record` (4), `planning_projection` (3), `budget_tracking` (3), `debt_management` (2), `complex_reasoning` (4), `wallet_management` (2), `tone_format` (1). Each test case includes `id`, `category`, `prompt`, and `expected` with `requiredTools`, `mustContain`, `mustNotContain`, and `mathCheck` where applicable. **Verify**: `EVAL_DATASET.length >= 32`.
- [x] 8.2 Create `apps/agent/eval/promptfoo-tests.yaml` mapping each dataset entry to a Promptfoo test case with `vars.prompt`, `assert` array (contains, not-contains, javascript tool checks, llm-rubric). Include 5 rubric themes from design.md D6. **Verify**: YAML parses cleanly.

## 9. Unit Tests & Validation

- [x] 9.1 Update `apps/agent/src/__tests__/unit/credits.test.ts`: add test for `calculateCreditsUsed` with pro-tier pricing ($1.25/$5.00); verify deduction amount differs from flash-tier. **Verify**: `bun test` passes.
- [x] 9.2 Run `bun test` in `apps/agent` — all unit tests pass. **Verify**: Exit code 0.
- [x] 9.3 Run `bun run check` in `apps/web` — no type errors from expanded model types. **Verify**: Exit code 0.
- [x] 9.4 Run `bunx promptfoo eval` from `apps/agent/eval/` — eval completes without crashes and produces a results file. **Verify**: Results JSON written to `apps/agent/eval/.promptfoo/output/`.
