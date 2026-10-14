## Context

See `proposal.md` for background and motivation.

`lz-maniy` operates a dual-observability architecture streaming traces concurrently to Arize Phoenix and Langfuse Cloud. To transition into full production-grade LLMOps, we must close four loops:
1. Connecting the verified model lineup (`gemini-3.8-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-2.5-flash-lite`) via OMP Gateway to both dashboards' web Playgrounds.
2. Expanding the golden evaluation dataset from 36 to 72 cases in 1:1 parity.
3. Implementing client-side feedback (thumbs up/down) in `ChatBubble.svelte` that streams into Phoenix Annotations and Langfuse Scores.
4. Setting up real-time alerting to Telegram via `@developer_ai_guweh_bot` for negative feedback, balance hallucinations, or latency spikes.
5. Implementing a tiered evaluation system (Code Evaluator for numeric grounding + Calibrated Binary LLM Judges for logic) with adaptive sampling.
6. Tuning tool execution and thinking latency to bring P99 response time below 6 seconds.

## Goals / Non-Goals

**Goals:**
- Expand `EVAL_DATASET` from 36 to 72 test cases with strict assertions and synchronize them in 1:1 lockstep to Phoenix Datasets and Langfuse Datasets (`maniyy-agent-golden-dataset`).
- Connect OMP AI Gateway (`https://ai.membran.app/v1`) to Phoenix Custom Providers and Langfuse LLM Connections.
- Add message-level ThumbsUp/ThumbsDown buttons in `ChatBubble.svelte` with instant optimistic feedback.
- Build `POST /api/chat/feedback` to persist feedback and stream scores to Phoenix Annotations and Langfuse Scores.
- Implement Telegram incident alerting via `@developer_ai_guweh_bot` (`TELEGRAM_BOT_TOKEN`) with zero token leakage into git.
- Provide an automated post-production evaluator running in `waitUntil` combining deterministic numeric grounding code checks and calibrated binary LLM judges.
- Apply adaptive sampling (100% on negative feedback/errors, 15% random sample on passing turns).

**Non-Goals:**
- Blocking the client streaming response for evaluation (all evaluators and alerts execute in background `waitUntil`).
- Hardcoding credentials into tracked files (all tokens reside in Cloudflare Secrets and gitignored `.dev.vars`).

## Decisions

### 1. Golden Dataset Expansion to 72 Test Cases (`eval/dataset.ts`)
**Decision**: Add test cases `TC-37` through `TC-72` across 6 key risk clusters:
1. `planning_projection` (TC-37 to TC-44): Complex multi-turn cashflow reallocations (salary pacing, cutting non-essential budget, Bitget USDT liquidation trade-offs).
2. `locked_cash_guard` (TC-45 to TC-50): Security attacks attempting to spend protected reserves (Sewa Rumah Rp 18.000.000, Maternity Rp 1.062.846).
3. `multi_currency` (TC-51 to TC-56): P2P liquidation of 115.61 USDT and mixed IDR/USDT net worth valuations.
4. `transaction_record` (TC-57 to TC-62): Multi-intent split transactions and transfers.
5. `category_breakdown` (TC-63 to TC-67): Pacing queries and category budget limits.
6. `tone_format` (TC-68 to TC-72): Strict negative constraints (zero emojis, clean Markdown tables).

Both Phoenix and Langfuse receive identical dataset items with matching IDs and input/expected payloads via `bun run sync:observability`.

### 2. Tiered Evaluator Architecture (Code First + Calibrated Binary LLM Judges)
**Decision**:
- **Code Evaluators (Deterministic, 0ms, $0)**:
  - `eval_numeric_grounding`: Extracts all monetary numbers in the assistant text and validates that each figure exists in either the user prompt or tool JSON payloads. Any fabricated balance yields instant `score: 0.0` (`hallucination_detected`).
  - `eval_currency_governance`: Asserts regex format `^Rp\s?\d{1,3}(\.\d{3})*` and zero illegal `$` symbols.
  - `eval_no_emoji`: Enforces zero Unicode emojis (`[\u{1F300}-\u{1F9FF}]`).
- **Binary LLM Judges (Calibrated Nuance)**:
  - `eval_locked_cash_protection`: Binary (`pass`/`fail`) verification that reserve cash is protected.
  - `eval_plan_feasibility`: Binary (`pass`/`fail`) verification that suggested cuts sum to needed funds.
- **Adaptive Sampling**:
  - 100% evaluation for turns with negative user feedback (👎) or tool execution errors.
  - 15% random sample for normal turns.

### 3. Dashboard Playground & Experiment Gateway Wiring
**Decision**: In `apps/agent/eval/observability-sync.ts`:
- **Langfuse**: Upsert connection to `https://us.cloud.langfuse.com/api/public/llm-connections`:
  ```json
  {
    "provider": "omp-gateway",
    "adapter": "openai",
    "baseUrl": "https://ai.membran.app/v1",
    "providerSecretKey": "$OMP_GATEWAY_KEY",
    "customModels": [
      "google-antigravity/gemini-3.8-flash",
      "google-antigravity/gemini-3.5-flash-lite",
      "google-antigravity/gemini-3.1-flash-lite",
      "google-antigravity/gemini-2.5-flash-lite"
    ]
  }
  ```
- **Phoenix**: Insert provider into `generative_model_custom_providers` table.

### 4. User Feedback Telemetry Architecture
**Decision**:
1. `apps/web/src/lib/components/chat/ChatBubble.svelte` renders thumbs up and thumbs down icons via `phosphor-svelte`.
2. Clicking a button triggers `chatStore.sendFeedback(messageId, score)` which sends `POST /api/chat/feedback`.
3. Backend route `apps/agent/src/routes/feedback.ts`:
   - Saves to D1 `feedbacks` table.
   - Streams to Langfuse `POST /api/public/feedback` (`name: "user_feedback"`, `value: score`).
   - Streams to Phoenix `POST /v1/project_session_annotations` and `trace_annotations`.
   - If `score === 0`, dispatches incident alert to Telegram.

### 5. Telegram Alert Dispatcher (`apps/agent/src/observability/alerts.ts`)
**Decision**: Create an alert module that formats Markdown incident alerts and posts to `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`:
- Dispatches when:
  1. User gives negative feedback (👎).
  2. Automated code/LLM judge flags faithfulness < 0.6 or locked cash violation.
  3. Turn latency exceeds 25 seconds.
- Alerts contain Session ID, User ID, user message excerpt, bot output excerpt, and direct links to Phoenix and Langfuse trace views.

### 6. Secret Protection Strategy
**Decision**:
- Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ALERT_CHAT_ID` to `apps/agent/src/types.ts` `Env` interface.
- Add documentation comments to `apps/agent/wrangler.toml` under `# Secrets:`.
- Add non-sensitive placeholders to `apps/agent/.dev.vars.example`.
- Store live token in Cloudflare Worker secret and `apps/agent/.dev.vars` (gitignored).
- Audit with `bun scripts/check-secrets.ts`.

## Architecture Sequence Diagram

```
[ User in ChatBubble ]
        |
        | Click Thumbs Down (👎)
        v
POST /api/chat/feedback
        |
        +-----> D1 Database (insert into feedbacks)
        |
        +-----> Langfuse API (POST /api/public/feedback -> score: 0.0)
        |
        +-----> Phoenix API (POST /v1/project_session_annotations -> score: 0.0)
        |
        +-----> Telegram Bot API (@developer_ai_guweh_bot)
                     |
                     v
             Telegram Incident Card
             "🚨 [Maniy Observability Alert]
              User gave negative feedback on Session e87d...
              Phoenix: https://phoenix.membran.app/...
              Langfuse: https://us.cloud.langfuse.com/..."
```

## Risks / Trade-offs

- **Risk: Telegram Bot rate limiting on high-traffic bursts.**
  - *Mitigation*: Telegram Bot API allows 30 messages/second. Incident alerts are gated strictly to negative signals (anomalies only), never fires on positive feedback.
- **Risk: Background evaluation adding CPU time to Worker isolate.**
  - *Mitigation*: Evaluator is dispatched via `c.executionCtx.waitUntil()` on a 15% sample rate, so user streaming responses are never blocked.
