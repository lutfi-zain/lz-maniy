## Why

Production AI operations demand an enterprise-grade, closed-loop evaluation system. Currently, live user chat turns lack automated quality scoring (leaving the Phoenix `annotations` column unpopulated), multi-turn tool execution latency suffers from unoptimized sequential calls and heavy thinking overhead, the golden evaluation dataset is limited to 36 test cases, OMP Gateway models are not connected to Phoenix or Langfuse web Playgrounds, and there is no real-time Telegram alerting when users report bad responses or models hallucinate financial balances.

## What Changes

- **Parallel Tool Execution & Latency Optimization**: Refactor tool dispatch in the agent loop so independent tool calls execute concurrently via `Promise.allSettled`, reducing P99 tool overhead. Tune default thinking level to `"low"` for normal conversational turns to achieve responsive 3-5s TTFB, while preserving `"medium"` for complex multi-month ledger projections.
- **Deep-Dive Evaluator Architecture (Code First + Calibrated Binary LLM Judges)**:
  - *Code Evaluators (Deterministic, 0ms, $0)*: Implement deterministic numeric grounding (validating every monetary figure against tool JSONs or user prompt), currency regex enforcement (`Rp X.XXX.XXX`), and anti-slop/no-emoji validation.
  - *Calibrated Binary LLM Judges*: Implement binary (`pass`/`fail`) judges for `locked_cash_protection`, `plan_feasibility`, and `tool_relevance`. Calibrate prompts against a 40-case human ground-truth dataset requiring TPR $\ge$ 90% and TNR $\ge$ 90% before production deployment.
  - *Adaptive Sampling Strategy*: Execute continuous evaluation in `c.executionCtx.waitUntil()` on 100% of negative feedback turns or tool errors, and a 15% random sample on passing turns to optimize Worker subrequest and token budgets.
- **Golden Dataset Expansion & 1:1 Parity**: Expand `EVAL_DATASET` in `apps/agent/eval/dataset.ts` from 36 to 72 test cases covering real-world multi-turn cashflow reallocations (salary pacing, goal liquidation, internal pocket borrowing), locked cash protection attacks, multi-currency conversions, and negative anti-slop constraints. Synchronize all 72 items identically to Phoenix Datasets and Langfuse Datasets (`maniyy-agent-golden-dataset`).
- **OMP Gateway Connection for Web Playgrounds**: Register `omp-gateway` with active Google Antigravity Gemini models (`gemini-3.8-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-2.5-flash-lite`) in Langfuse LLM Connections and Phoenix Custom Generative Model Providers, enabling browser-based playground prompt testing and experiment execution.
- **User Feedback Loop (UI to Telemetry)**: Add ThumbsUp 👍 and ThumbsDown 👎 buttons in `apps/web/src/lib/components/chat/ChatBubble.svelte` and implement `POST /api/chat/feedback` in `apps/agent` to stream user feedback into Langfuse Scores and Phoenix `project_session_annotations` / `trace_annotations`.
- **Telegram Incident Alert Hook**: Implement a real-time notification hook in `apps/agent` sending structured alert cards via `@developer_ai_guweh_bot` (`TELEGRAM_BOT_TOKEN`) on negative feedback, evaluation failure, or latency spikes (>25s) with direct links to Phoenix and Langfuse traces.
- **Zero-Secret Hygiene**: Enforce strict isolation where `TELEGRAM_BOT_TOKEN` and `OMP_GATEWAY_KEY` reside exclusively in Cloudflare Worker Secrets and `.dev.vars` (gitignored), verified by `bun scripts/check-secrets.ts`.

## Capabilities

### New Capabilities
<!-- None: this change extends existing agent-observability and agent-chat capabilities. -->

### Modified Capabilities
- `agent-observability`: Enforce post-production evaluation metrics, user feedback telemetry, Telegram alert webhooks, and 72-case golden dataset parity between Phoenix and Langfuse.
- `agent-chat/frontend`: Add message feedback controls (thumbs up/down) and API dispatch to `ChatBubble.svelte`.

## Impact

- **Affected Systems**: `apps/web/src/lib/components/chat/ChatBubble.svelte`, `apps/agent/src/routes/chat.ts`, `apps/agent/src/routes/feedback.ts` (new), `apps/agent/eval/dataset.ts`, `apps/agent/eval/observability-sync.ts`, `apps/agent/src/observability/alerts.ts` (new), `apps/agent/src/observability/evaluators.ts` (new), `apps/agent/src/types.ts`.
- **Dependencies**: No external npm packages required; uses native fetch and existing dependencies.
- **Breaking Changes**: None. Backwards compatible with existing chat streaming and storage.
