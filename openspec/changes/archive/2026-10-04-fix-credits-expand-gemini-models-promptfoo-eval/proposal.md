## Why

Three interconnected issues prevent effective iteration on agent quality:

1. **Credit system appears frozen**: The Gemini native runner emits hardcoded `d:` finish metadata with static `{promptTokens:100,completionTokens:100}` and never includes `creditsUsed` / `creditsRemaining`. The AI SDK path settles credits in `waitUntil` but never injects credit metadata into the SSE stream. The frontend only updates credits from SSE `d:` events or a single `GET /api/credits` on panel open—so the user sees a static balance. Additionally, the `credit_pricing` table only seeds 4 models; any model mismatch falls back to conservative pricing silently.
2. **Only 3 Gemini models exposed**: The `AVAILABLE_MODELS` list in `apps/agent/src/agent/models.ts` and `DEFAULT_MODELS` in `packages/shared/src/chat.ts` hardcode 3 models (`gemini-3.1-flash-lite`, `gemini-3.7-flash`, `gemini-3.8-flash`). The OMP gateway `google-antigravity` provider exposes 12 Gemini models (including `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-3-flash`, `gemini-3-pro`, `gemini-3.1-pro`, `gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-3.6-flash`), all with tool-calling and thinking support.
3. **No systematic prompt/behavior evaluation**: The existing `apps/agent/eval/` harness has 9 test cases with basic keyword and tool-call checks but lacks LLM-as-judge grading, real user conversation use cases, A/B prompt comparison, and structured Promptfoo integration. Real user interaction patterns from 282 Telegram messages (exported `tmp/result.json`) reveal categories like debt reasoning, planning projection, complex sanity-check questions, and transaction recording that are not covered.

## What Changes

- **Fix credit deduction visibility**: Inject `creditsUsed` and `creditsRemaining` into the SSE `d:` finish event for both the Gemini native runner path and the AI SDK `onFinish` path. Refetch credits on frontend after each stream completes. Replace hardcoded `{promptTokens:100,completionTokens:100}` in `gemini-native.ts` with actual `usageMetadata` from the Gemini API response.
- **Expand Gemini model list**: Add all 12 available `google-antigravity` Gemini models to `AVAILABLE_MODELS` (backend) and `DEFAULT_MODELS` (shared). Seed `credit_pricing` rows for all new models. Update frontend `ChatModelPicker` to display the expanded list.
- **Integrate Promptfoo evaluation**: Add `promptfooconfig.yaml` at `apps/agent/eval/`, expand `dataset.ts` with 23+ real-user use cases extracted from the Telegram session (covering `balance_query`, `transaction_record`, `planning_projection`, `budget_tracking`, `debt_management`, `complex_reasoning`, `wallet_management`, `tone_format`), and add an LLM-as-judge assertion layer via Promptfoo's `llm-rubric` for tone, hallucination, and financial accuracy checks.

## Capabilities

### New Capabilities
- `agent-eval`: Promptfoo-based evaluation framework with real-user test cases, deterministic + LLM-as-judge scoring, and multi-model comparison.

### Modified Capabilities
- `agent-chat/credits`: Fix SSE credit metadata emission and frontend balance refresh after each chat turn.
- `agent-chat/backend`: Expand `AVAILABLE_MODELS` to all 12 google-antigravity Gemini models; replace hardcoded usage metadata in Gemini runner with actual token counts.
- `agent-chat/shared-types`: Expand `DEFAULT_MODELS` to match backend model list.
- `agent-chat/infra`: Add `credit_pricing` seed rows for all new Gemini models.
- `agent-chat/frontend`: Refresh credit balance after stream completion; display expanded model list in picker.

### Non-Goals
- Payment / top-up integration (credits remain free-granted)
- Claude or non-Gemini models (only google-antigravity Gemini models in scope)
- Agent memory or system prompt rewrite (eval will measure current prompt, not change it)
- Streaming mid-flight credit abort
- Changes to Reedrich API or financial tools

## Impact
- Users see accurate, live-updating credit balances after every chat turn
- Users can select from 12 Gemini models instead of 3
- Developers can run `bunx promptfoo eval` to benchmark system prompt and model quality against real user conversation patterns, enabling data-driven prompt iteration
