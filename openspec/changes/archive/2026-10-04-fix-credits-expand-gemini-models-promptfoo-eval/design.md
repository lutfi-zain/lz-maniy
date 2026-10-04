## Context

See proposal.md for motivation. Three areas of change: credit visibility fix, model list expansion, and Promptfoo eval integration.

Current state:
- **Credits**: Backend settles credits in `c.executionCtx.waitUntil()` after stream close. Gemini native runner (`gemini-native.ts`) emits hardcoded `d:{"finishReason":"stop","usage":{"promptTokens":100,"completionTokens":100}}` at lines 197-198/207-208—never includes `creditsUsed`/`creditsRemaining`. AI SDK path (`chat.ts:292-314`) uses `onFinish` → `settleCredits()` inside `waitUntil`, but `result.toDataStreamResponse()` only emits AI SDK's default `d:` event (finishReason + usage), not the credit fields. Frontend (`chat.svelte.ts:524-546`) parses `d:` for `creditsUsed`/`creditsRemaining` but never receives them. `loadCredits()` only fires on `panelOpen` (line 72-73), never after stream end (line 667-673 `finally` block has no refetch).
- **Models**: `AVAILABLE_MODELS` (3 entries) in `apps/agent/src/agent/models.ts`, mirrored in `DEFAULT_MODELS` (3 entries) in `packages/shared/src/chat.ts`. OMP gateway `google-antigravity` has 12 Gemini models. `credit_pricing` table seeds 4 rows (3 Gemini + 1 Groq).
- **Eval**: `apps/agent/eval/` has `dataset.ts` (9 test cases), `run.ts` (AI SDK runner), `run-gemini.ts` (native runner). No Promptfoo, no LLM-as-judge, no real-user test cases.

## Goals / Non-Goals

**Goals:**
- Credits decrement visibly after every chat turn in the UI
- All 12 google-antigravity Gemini models selectable with correct pricing
- Promptfoo evaluation with 23+ real-user test cases and LLM-as-judge scoring

**Non-Goals:**
- Reworking SSE protocol (keep existing prefix scheme)
- Payment/top-up system
- Claude or non-Gemini model support
- System prompt changes (eval measures current prompt)

## Decisions

### D1: Credit Settlement Integrated into Stream Response

**Problem**: `settleCredits()` runs in `waitUntil` after stream closes, so credit data never reaches the SSE stream.

**Approach**: For the Gemini native runner path, accumulate `usageMetadata` across tool-call loops and call `settleCredits()` before emitting the final `d:` event inside the generator. Inject `creditsUsed` and `creditsRemaining` into the `d:` JSON payload. For the AI SDK path, the `onFinish` callback already has token usage; call `settleCredits()` there and emit a custom SSE event with credit data before `controller.close()`. Since `onFinish` runs inside `waitUntil`, we need a different approach: use a `StreamData` instance to append credit metadata synchronously into the data stream.

**Decision**: Use Vercel AI SDK's `StreamData` to inject credit metadata into the AI SDK response stream. For Gemini native, settle credits inside the generator before yielding the `d:` event.

**Alternative considered**: Frontend-only refetch after every stream. Rejected because it adds a round-trip and doesn't solve the Gemini runner's hardcoded token counts.

**Fallback**: Frontend always calls `loadCredits()` in the `finally` block after stream ends, as a safety net for both paths.

### D2: Gemini Runner Token Count Extraction

**Problem**: Lines 197-198, 207-208 of `gemini-native.ts` emit `promptTokens:100,completionTokens:100` regardless of actual usage.

**Approach**: The `@google/genai` SDK `GenerateContentResponse` has `usageMetadata` with `promptTokenCount` and `candidatesTokenCount`. Accumulate these across the tool-call loop iterations. The initial non-streaming `chat.sendMessage()` response (line 115) also has `usageMetadata`. The streaming responses from `chat.sendMessageStream()` have per-chunk usage; use the final chunk's cumulative values.

**Decision**: Track `totalPromptTokens` and `totalCompletionTokens` as mutable variables in `runGeminiStream`. After each `sendMessage`/`sendMessageStream`, extract and accumulate from `response.usageMetadata`. Use accumulated totals in the final `e:` and `d:` events and for credit settlement.

### D3: Expanded Model Registry

**Decision**: Add all 12 google-antigravity Gemini models to both `AVAILABLE_MODELS` and `DEFAULT_MODELS`. Model metadata derived from `omp models` output:

| Model ID | Display Name | Context | Thinking Levels | Tier |
|---|---|---|---|---|
| `gemini-2.5-flash` | Gemini 2.5 Flash | 1M | off,minimal,low,medium,high | Flash |
| `gemini-2.5-flash-lite` | Gemini 2.5 Flash Lite | 1M | off,minimal,low,medium,high | Lite |
| `gemini-2.5-pro` | Gemini 2.5 Pro | 1M | off,minimal,low,medium,high | Pro |
| `gemini-3-flash` | Gemini 3 Flash | 1M | off,minimal,low,medium,high | Flash |
| `gemini-3-pro` | Gemini 3 Pro | 1M | off,low,high | Pro |
| `gemini-3.1-flash-lite` | Gemini 3.1 Flash Lite | 1M | off,minimal,low,medium,high | Lite |
| `gemini-3.1-pro` | Gemini 3.1 Pro | 1M | off,low,high | Pro |
| `gemini-3.5-flash` | Gemini 3.5 Flash | 1M | off,minimal,low,medium,high | Flash |
| `gemini-3.5-flash-lite` | Gemini 3.5 Flash Lite | 1M | off,minimal,low,medium,high | Lite |
| `gemini-3.6-flash` | Gemini 3.6 Flash | 1M | off,minimal,low,medium,high | Flash |
| `gemini-3.7-flash` | Gemini 3.7 Flash | 1M | off,minimal,low,medium,high | Flash |
| `gemini-3.8-flash` | Gemini 3.8 Flash | 1M | off,minimal,low,medium,high | Flash |

All models: `provider: 'omp'`, `model: 'google-antigravity/<id>'`, `vision: true`, `tool_calling: true`, `thinking: true`, `contextWindow: 1_000_000`.

Credit pricing by tier:
- **Lite**: `inputPerMillion: 0.25`, `outputPerMillion: 1.50`
- **Flash**: `inputPerMillion: 0.75`, `outputPerMillion: 3.75`
- **Pro**: `inputPerMillion: 1.25`, `outputPerMillion: 5.00`

### D4: Model Picker Tier Grouping

**Decision**: Group models in `ChatModelPicker.svelte` dropdown by tier using derived arrays:

```
liteModels  = models matching *-lite
proModels   = models matching *-pro
flashModels = remaining
```

Each group gets a small label header (`Lite`, `Flash`, `Pro`). Order: Lite → Flash → Pro (cheapest first). The existing `googleModels` derived filter already handles the `google-antigravity/` prefix.

### D5: Promptfoo Integration Architecture

```
apps/agent/eval/
  promptfooconfig.yaml     <-- NEW: model list, provider, test suite config
  provider.ts              <-- NEW: custom Promptfoo provider (tool-calling agent)
  dataset.ts               <-- MODIFIED: expand from 9 to 32+ test cases
  run.ts                   <-- UNCHANGED (legacy harness kept)
  run-gemini.ts            <-- UNCHANGED
```

**Custom provider** (`provider.ts`): Promptfoo requires a provider that returns `{ output: string }`. The provider will:
1. Import `buildSystemPrompt`, all tool factories, and `getModel`
2. Accept prompt from Promptfoo, construct messages array
3. Call `streamText` with full tool set and `maxSteps: 10`
4. Collect all steps, tool calls, and final text
5. Return `{ output: finalText, metadata: { toolCalls, steps, tokenUsage } }`

**Config** (`promptfooconfig.yaml`):
```yaml
providers:
  - id: file://provider.ts
    config:
      model: google-antigravity/gemini-3.7-flash
  - id: file://provider.ts
    config:
      model: google-antigravity/gemini-3.8-flash
  - id: file://provider.ts
    config:
      model: google-antigravity/gemini-2.5-pro

tests: file://promptfoo-tests.yaml
```

**Test cases** sourced from Telegram export `tmp/result.json` (282 user messages, 23 curated). Each test case:
```yaml
- description: "Balance query: Saldo BCA"
  vars:
    prompt: "Saldo bca saya berapa?"
  assert:
    - type: contains
      value: "Rp"
    - type: javascript
      value: "output.includes('get_snapshot') || output.includes('list_wallets')"
    - type: llm-rubric
      value: "Response must show a specific Rupiah amount from tool data, not hallucinate a balance"
    - type: not-contains
      value: "$"
```

### D6: LLM-as-Judge Rubric Categories

Five rubric themes applied across test cases:

1. **Financial accuracy**: "Agent must use tool-retrieved data, never hallucinate financial numbers"
2. **Currency formatting**: "All monetary values in Indonesian Rupiah (Rp), never USD ($)"
3. **Tone compliance**: "Response in Indonesian, concise tabular format when applicable, no emoji/icons per user preference"
4. **Tool efficiency**: "Agent should call minimum necessary tools, not over-fetch"
5. **Reasoning transparency**: "For complex queries, agent should show calculation steps or explain data sources"

## Risks / Trade-offs

1. **Gemini `usageMetadata` availability**: Some Gemini responses may not include `usageMetadata` (e.g., early-abort, 503 errors). Mitigation: fallback to word-count estimation, same as current AI SDK path behavior.
2. **`StreamData` compatibility**: Vercel AI SDK's `StreamData` API has changed across versions. Need to verify the installed version supports `data.append()` or `data.appendMessageAnnotation()`. Mitigation: if unsupported, fall back to custom SSE event emission before `controller.close()`.
3. **12 models in picker**: More choices may overwhelm users. Mitigation: tier grouping with labels keeps the list scannable; default remains `gemini-3.7-flash`.
4. **Promptfoo provider cold start**: Each eval invocation cold-starts the tool set and OMP gateway connection. For 32 test cases × 3 models = 96 calls. Mitigation: Promptfoo has built-in concurrency control; set `maxConcurrency: 2` to avoid rate limits.
5. **Credit_pricing migration**: Adding rows via a new migration file (`0005_expand_pricing.sql`) rather than editing `0004_credits.sql` to avoid re-running existing migration. Uses `INSERT OR IGNORE` for idempotency.

## Test Strategy

### Unit Tests (Vitest)
- `credits.test.ts`: Verify `calculateCreditsUsed` with pro-tier pricing rates; verify `deductCredits` returns correct remaining balance
- `models.test.ts`: Assert `AVAILABLE_MODELS.length === 12`; each entry has required fields; model IDs match expected list
- `provider.test.ts`: Mock Promptfoo provider output; verify tool call collection and final text extraction

### Integration Tests
- Credit flow: Send chat request, verify `d:` SSE event contains `creditsUsed` and `creditsRemaining` with non-hardcoded values
- Model routing: Send chat request with `google-antigravity/gemini-2.5-pro`, verify successful response

### Eval Tests (Promptfoo)
- Run `bunx promptfoo eval` against `gemini-3.7-flash`; expect >= 75% pass rate across 32+ test cases
- Compare scores across 3 models to identify reasoning gaps
