## Why

The current financial agent implementation suffers from hardcoded 10-step iteration limits that silently abort complex multi-page reconciliation tasks, an unreachable 800k-token compaction threshold that ignores multi-kilobyte tool payloads and strips summaries, and absent active defense against prompt injection and ungrounded hallucinations. Upgrading to enterprise standards unlocks safe dozens-of-step autonomous workflows, entity-preserving working memory compaction, active multi-tier guardrails, and closed-loop evaluation flywheel synchronization.

## What Changes

- **Adaptive High-Iteration Engine**: Allow dynamic step budgets scaling from 5 steps for simple queries up to 40+ steps for deep multi-page bank statement reconciliation and multi-period horizon simulations, accompanied by in-flight loop detection (hash-based cycle breaker), intermediate SSE progress heartbeats, volatile scratchpad pruning, and guaranteed graceful fallback synthesis.
- **Entity-Preserving Context Compaction**: Implement a realistic operational working memory threshold (16,000–24,000 tokens) with a subword/character token estimator that measures structured tool call invocations and response payloads; compact dialogue via an extractive-abstractive ledger that preserves wallet IDs, transaction figures, and active commitments, injecting the resulting summary directly into the active system context.
- **4-Tier Agentic Guardrails**: Introduce pre-LLM prompt injection and jailbreak screening, in-flight policy gates (strict locked cash defense and Human-in-the-Loop confirmation for high-value or destructive mutations), tenant-isolated schema bounds, and in-band output numeric grounding verification before streaming to the client.
- **Full-Spectrum AI Evaluation & Flywheel Expansion**: Extend Level 0 through Level 4 evaluation suites to test loop efficiency, injection resistance, and compaction fidelity; update D1 database tables (`eval_queue`, `eval_dataset_candidates`) with new trigger reasons (`guardrail_trip`, `iteration_exhaustion`) and new domain categories (`guardrail_safety`, `compaction_retention`).

## Capabilities

### New Capabilities
- `agent-guardrails`: 4-tier security and safety guardrail architecture encompassing input prompt injection/jailbreak classification, policy confirmation gates, execution boundaries, and in-band output numeric grounding.

### Modified Capabilities
- `agent-chat/backend`: Adaptive dynamic iteration budgeting (up to dozens of steps), cyclic loop breaker, stream progress telemetry, volatile tool result pruning, operational working memory compaction, and structured ledger summary preservation.
- `eval-flywheel`: Asynchronous evaluation queue and production dataset staging extended to capture guardrail trips, iteration exhaustion, and compaction retention failures into continuous CI regression benchmarks.

## Scope Boundaries

### In-Scope
- Cloudflare Worker backend chat pipeline (`apps/agent/src/routes/chat.ts`).
- Compaction and token estimation algorithms (`apps/agent/src/agent/compaction.ts`, `apps/agent/src/agent/compaction-worker.ts`).
- Multi-tier guardrails module (`apps/agent/src/agent/guardrails/`).
- Evaluation and judge rubrics (`apps/agent/src/observability/evaluators.ts`, `apps/agent/src/observability/async-judge.ts`, `apps/agent/src/observability/flywheel.ts`).
- Database schema migrations for D1 eval queue and candidates (`apps/agent/db/migrations/`).
- CI evaluation datasets and matrix configurations (`apps/agent/eval/dataset.ts`, `apps/agent/eval/promptfooconfig.yaml`, `apps/agent/eval/phoenix-suite.ts`).

### Non-Goals
- Altering the core Reedrich REST API v1.17.0 contracts or endpoints.
- Introducing external vector database infrastructure (Cloudflare D1 and KV remain the primary storage engines).
- Replacing Vercel AI SDK or Google Antigravity Gemini upstream model routing.
- Client-side UI redesign of the Maniy web application (except handling progress SSE events and confirmation modal triggers).
