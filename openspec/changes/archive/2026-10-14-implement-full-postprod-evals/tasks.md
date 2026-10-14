## 1. Golden Dataset Expansion to 72 Cases

- [x] 1.1 In `apps/agent/eval/dataset.ts`, author test cases `TC-37` through `TC-72` covering multi-turn cashflow pacing, goal liquidation, locked wallet violation attacks, and anti-slop constraints.
- [x] 1.2 In `apps/agent/eval/observability-sync.ts`, update dataset synchronization routine to mirror all 72 cases in 1:1 parity between Phoenix and Langfuse.

## 2. Dashboard Playground & OMP Gateway Connection

- [x] 2.1 In `apps/agent/eval/observability-sync.ts`, add routine to register `omp-gateway` with active Google Antigravity Gemini models (`gemini-3.8-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-2.5-flash-lite`) into Langfuse LLM Connections (`/api/public/llm-connections`).
- [x] 2.2 In `apps/agent/eval/observability-sync.ts`, add SQL routine registering `omp-gateway` into Phoenix `generative_model_custom_providers` table.

## 3. User Feedback Loop & Backend Route

- [x] 3.1 In `apps/agent/src/types.ts`, add feedback types and update `Env` with `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ALERT_CHAT_ID`.
- [x] 3.2 In `apps/agent/src/routes/feedback.ts`, implement `POST /api/chat/feedback` to persist to D1 and stream feedback scores to Langfuse and Phoenix.
- [x] 3.3 In `apps/web/src/lib/components/chat/ChatBubble.svelte` and `chat.svelte.ts`, implement ThumbsUp and ThumbsDown UI buttons and wire them to `/api/chat/feedback`.

## 4. Telegram Alert Hook & Post-Production Evaluators

- [x] 4.1 In `apps/agent/src/observability/alerts.ts`, implement Telegram alert dispatcher sending Markdown incident cards via `@developer_ai_guweh_bot` on negative feedback or failures.
- [x] 4.2 In `apps/agent/src/observability/evaluators.ts`, implement deterministic code evaluators (numeric grounding check against tool JSONs, currency regex, anti-slop) and calibrated binary LLM judges (`locked_cash_protection`, `plan_feasibility`).
- [x] 4.3 In `apps/agent/src/routes/chat.ts`, wire adaptive sampling (100% negative/error, 15% normal turns) in `c.executionCtx.waitUntil()` to evaluate live turns and stream scores.

## 5. Verification, Test Suite & Secret Hygiene

- [x] 5.1 Add unit tests in `apps/agent/src/__tests__/unit/feedback.test.ts` and `apps/agent/src/observability/__tests__/evaluators.test.ts` verifying feedback persistence, score routing to Phoenix/Langfuse, and Telegram alert dispatch.
- [x] 5.2 Execute `bun run sync:observability` and verify all 72 dataset items and OMP Gateway providers are live in Phoenix and Langfuse.
- [x] 5.3 Run full test suites `bun run test:agent` and `bun run check:web`.
- [x] 5.4 Execute pre-commit secret scans (`bun scripts/check-secrets.ts`) to ensure zero tokens (`8990169257:*`, `sk-lf-*`, `OMP_*`) are leaked into git.
