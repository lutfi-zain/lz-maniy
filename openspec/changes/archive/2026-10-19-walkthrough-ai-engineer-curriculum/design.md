## Context

See `proposal.md` for motivation.

The `apps/agent` package runs on Cloudflare Workers edge runtime and contains a complete, enterprise-grade AI Engineering implementation:
- Runtime & Provider Routing (`src/index.ts`, `src/agent/models.ts`, `src/routes/chat.ts`)
- Parameterized Tool Calling & Schemas (`src/agent/tools/*`)
- Multi-Turn History & Compaction (`src/agent/history.ts`, `src/agent/compaction*`)
- Full 5-Tier Evaluation Pyramid (`src/observability/evaluators.ts`, `eval/grader.ts`, `eval/promptfooconfig.yaml`, `eval/phoenix-suite.ts`, `src/observability/tracer.ts`, `src/observability/async-judge.ts`, `src/observability/pii-scrubber.ts`, `src/observability/flywheel.ts`)

To make this codebase an executable learning and replication blueprint, we must define the exact grammar, anchor locations, and master index design without bloating or degrading production code.

## Goals / Non-Goals

**Goals:**
- Provide a standardized, multi-syntax inline annotation grammar (`@walkthrough <stage>.<step>:<slug>`) that sorts chronologically when grep'd or searched.
- Provide self-contained concept explanations (`@notes`) and dual references (`@ref` linking to official docs and Donna OKF vault modules).
- Re-align Stage 05 to strictly reflect the 5-tier evaluation pyramid (Level 0 through Level 4, followed by PII Sanitization and Closed-Loop Flywheel).
- Provide `apps/agent/WALKTHROUGH.md` as the authoritative single-source-of-truth index mapping the [roadmap.sh/ai-engineer](https://roadmap.sh/ai-engineer) milestones directly to code anchors.
- Provide a concrete 5-minute agent replication recipe with minimal 6-file manifest and smoke verification.
- Provide an automated bidirectional integrity test (`apps/agent/src/__tests__/unit/walkthrough-integrity.test.ts`) ensuring all anchors remain valid and bidirectional.

**Non-Goals:**
- No alteration of runtime agent business logic, API routing, or database schema.
- No long, sprawling markdown articles in source code files; each tag block is constrained to 4-6 lines maximum.
- No modification of the frontend application (`apps/web`).

## Decisions

### 1. Multi-Syntax Tag Grammar

To ensure seamless greppability, IDE autocompletion, and zero syntax collisions across different file types (TypeScript, TOML, YAML, SQL), we establish 3 canonical comment syntax variants:

#### TypeScript / JavaScript (JSDoc block):
```typescript
/**
 * @walkthrough 05.02:async-llm-judge
 * @topic AI Evals Level 1: Decoupled Semantic LLM-as-a-Judge
 * @ref https://arize.com/docs/phoenix/evaluation/llm-evaluators | okf://knowledge/ai-evals-course/fase-3-multi-tier-evaluator-dan-rubric-engineering.md
 * @notes Menjalankan evaluasi semantik (Financial Soundness & Persona) secara asynchronous di D1 queue via Worker cron untuk menghindari subrequest & CPU limit edge streaming.
 */
```

#### TOML / YAML / Shell (Hash line comments):
```yaml
# @walkthrough 05.03:eval-promptfoo-gate
# @topic AI Evals Level 2: Pre-Deploy CI Gate Promptfoo
# @ref https://promptfoo.dev/docs/getting-started/ | okf://knowledge/ai-evals-course/fase-6-pre-deployment-cicd-dan-matrix-optimization.md
# @notes Evaluasi matriks multi-prompt dan multi-model secara offline di CI sebagai regression gate sebelum deployment.
```

#### SQL Migrations (Dash line comments):
```sql
-- @walkthrough 05.02:async-judge-queue-schema
-- @topic AI Evals: D1 Queue & Dataset Candidate Schema
-- @ref https://developers.cloudflare.com/d1/ | okf://knowledge/ai-evals-course/fase-4-dataset-engineering-dan-synthetic-curation.md
-- @notes Skema D1 untuk antrean evaluasi asynchronous (eval_queue) dan kurasi kegagalan produksi (eval_dataset_candidates).
```

**Key Invariants:**
- Identifier format: `^\d{2}\.\d{2}:[a-z0-9-]+$` (e.g. `01.01:worker-entrypoint`, `05.01:eval-code-grounding`).
- Zero-padded two-digit stage and step (`01.01` to `06.01`) guarantees strict chronological ordering in CLI `grep` and GitHub search.
- `@notes` provides a self-contained 1-2 sentence technical takeaway so the developer does not need to open external links to grasp the core concept.
- `@ref` combines external authoritative documentation with internal OKF knowledge vault paths.

---

### 2. Stage Breakdown & Anchor Mapping

The curriculum is partitioned into 6 sequential stages, strictly respecting the evaluation pyramid hierarchy:

```
+-----------------------------------------------------------------------------------------+
| STAGE 01: FOUNDATIONS & EDGE RUNTIME                                                    |
| 01.01:worker-entrypoint    -> src/index.ts (Cloudflare Worker fetch & scheduled export) |
| 01.02:environment-bindings -> wrangler.toml & .dev.vars.example (Env typing & secrets) |
| 01.03:hono-routing-layer   -> src/index.ts (Hono app mounting & middleware chaining)   |
+-----------------------------------------------------------------------------------------+
| STAGE 02: PROVIDERS & STREAMING PROTOCOL                                                |
| 02.01:multi-provider-model -> src/agent/models.ts (Vercel AI SDK Gemini/Groq/OpenAI)   |
| 02.02:edge-sse-streaming   -> src/routes/chat.ts (streamText & token streaming)         |
| 02.03:resilient-fallback   -> src/routes/chat.ts (attemptFallbackSynthesis pattern)     |
+-----------------------------------------------------------------------------------------+
| STAGE 03: PROMPT ENGINEERING & PARAMETERIZED TOOLS                                      |
| 03.01:system-prompt-ssot   -> src/agent/system-prompt.ts (Dynamic few-shot/compact)     |
| 03.02:zod-tool-definition  -> src/agent/tools/financial.ts (Type-safe tool calling)    |
| 03.03:tool-execution-guard -> src/agent/tools/mutations.ts (Tenant isolation & auth)   |
+-----------------------------------------------------------------------------------------+
| STAGE 04: CONTEXT WINDOW & AGENT MEMORY                                                 |
| 04.01:history-sanitization -> src/agent/history.ts (Format adapter across models)       |
| 04.02:token-compaction     -> src/agent/compaction.ts (Context budget & truncation)     |
| 04.03:long-term-memory     -> src/agent/tools/memory.ts (Persistent user preferences)   |
+-----------------------------------------------------------------------------------------+
| STAGE 05: THE AI EVALUATION PYRAMID (ALL LEVELS)                                        |
| 05.01:eval-code-grounding  -> src/observability/evaluators.ts (Level 0: Deterministic) |
| 05.02:async-llm-judge      -> src/observability/async-judge.ts, src/routes/eval.ts,     |
|                               db/migrations/0006_eval_flywheel.sql (Level 1: CoT Judge) |
| 05.03:eval-promptfoo-gate  -> eval/promptfooconfig.yaml, eval/grader.ts (Level 2: CI)  |
| 05.04:eval-phoenix-suite   -> eval/phoenix-suite.ts, eval/dataset.ts (Level 3: Bench)   |
| 05.05:eval-otel-tracing    -> src/observability/tracer.ts, src/middleware/tracing.ts    |
|                               (Level 4: OpenInference Distributed Tracing & Telemetry)  |
| 05.06:pii-scrubber         -> src/observability/pii-scrubber.ts (4-Pass PII Sanitizer)  |
| 05.07:dataset-flywheel     -> src/observability/flywheel.ts, eval/flywheel-sync.ts,     |
|                               src/db/queries.ts (Closed-Loop CI Regression Flywheel)    |
+-----------------------------------------------------------------------------------------+
| STAGE 06: NEW AGENT REPLICATION RECIPE                                                  |
| 06.01:scaffold-new-agent   -> apps/agent/WALKTHROUGH.md (5-minute step-by-step recipe) |
+-----------------------------------------------------------------------------------------+
```

---

### 3. Donna OKF Knowledge Vault Reference Mapping

The `@ref` attributes bridge external documentation with our curated OKF vault curriculum:

| Step Tag | External Authority | OKF Knowledge Vault Module |
| :--- | :--- | :--- |
| `01.01`, `01.03` | [Hono on Cloudflare Workers](https://hono.dev/getting-started/cloudflare-workers) | `okf://knowledge/vps-infra/concepts/hyperdrive-edge.md` |
| `01.02` | [Cloudflare Worker Secrets](https://developers.cloudflare.com/workers/configuration/secrets/) | `okf://knowledge/vps-infra/concepts/omp-gateway.md` |
| `02.01` | [Vercel AI SDK Providers](https://sdk.vercel.ai/docs/foundations/providers-and-models) | `okf://knowledge/langfuse-vercel-ai-sdk/fase-2-agentic-loops-tool-calls-dan-multimodal.md` |
| `02.02`, `02.03` | [AI SDK streamText & Fallback](https://sdk.vercel.ai/docs/ai-sdk-core/streaming) | `okf://knowledge/langfuse-vercel-ai-sdk/fase-2-agentic-loops-tool-calls-dan-multimodal.md` |
| `03.01` | [Prompt Engineering Guide](https://www.promptingguide.ai/) | `okf://knowledge/langfuse-vercel-ai-sdk/fase-3-centralized-prompt-management.md` |
| `03.02`, `03.03` | [AI SDK Tool Calling](https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling) | `okf://knowledge/ai-evals-course/fase-5-agentic-evaluation-trajectory-dan-state.md` |
| `04.01`, `04.02` | [Context Window Management](https://roadmap.sh/ai-engineer) | `okf://knowledge/ai-evals-course/fase-2-taksonomi-kegagalan-dan-error-analysis.md` |
| `04.03` | [Agent Memory Patterns](https://roadmap.sh/ai-engineer) | `okf://knowledge/vps-infra/concepts/hindsight-memory.md` |
| `05.01` (L0) | [Arize Code Evaluators](https://arize.com/docs/phoenix/evaluation/code-evaluators) | `okf://knowledge/ai-evals-course/fase-3-multi-tier-evaluator-dan-rubric-engineering.md` |
| `05.02` (L1) | [Arize LLM-as-a-Judge](https://arize.com/docs/phoenix/evaluation/llm-evaluators) | `okf://knowledge/ai-evals-course/fase-3-multi-tier-evaluator-dan-rubric-engineering.md` |
| `05.03` (L2) | [Promptfoo CI Evals](https://www.promptfoo.dev/docs/intro/) | `okf://knowledge/ai-evals-course/fase-6-pre-deployment-cicd-dan-matrix-optimization.md` |
| `05.04` (L3) | [Arize Phoenix Datasets](https://arize.com/docs/phoenix/datasets) | `okf://knowledge/ai-evals-course/fase-4-dataset-engineering-dan-synthetic-curation.md` |
| `05.05` (L4) | [OpenInference Tracing](https://github.com/Arize-ai/openinference) & [Langfuse Tracing](https://langfuse.com/docs/tracing) | `okf://knowledge/ai-evals-course/fase-7-post-production-observability-dan-drift.md` & `okf://knowledge/langfuse-vercel-ai-sdk/fase-1-arsitektur-telemetri-dan-tracing-dasar.md` |
| `05.06` | [Enterprise PII Sanitization](https://roadmap.sh/ai-engineer) | `okf://knowledge/ai-evals-course/fase-4-dataset-engineering-dan-synthetic-curation.md` |
| `05.07` | [Continuous Curation Flywheel](https://hamel.dev/evals/) | `okf://knowledge/ai-evals-course/fase-1-fondasi-dan-stochastic-shift.md` |

---

### 4. Stage 06: 5-Minute Agent Replication Blueprint

`WALKTHROUGH.md` defines the exact procedure to replicate a new agent from scratch:
1. **Minimal 6-File Manifest**:
   - `package.json`: `@ai-sdk/google`, `@ai-sdk/groq`, `ai`, `hono`, `zod`, `wrangler`, `vitest`, `promptfoo`.
   - `wrangler.toml`: Worker configuration with cron trigger `*/5 * * * *` and D1 binding.
   - `src/index.ts`: Hono app entrypoint exporting `fetch` and `scheduled`.
   - `src/agent/models.ts`: Multi-provider factory resolving models from environment keys.
   - `src/routes/chat.ts`: Streaming SSE endpoint using `streamText` and fallback synthesis.
   - `eval/promptfooconfig.yaml`: Pre-deploy benchmark matrix testing baseline vs compact prompts.
2. **Terminal Scaffolding Sequence**:
   - Step 1: Clone template files.
   - Step 2: `bun install`
   - Step 3: Populate `.dev.vars` with API credentials.
   - Step 4: `bun run dev` (starts local Worker on port 8787).
   - Step 5: Execute smoke curl:
     ```bash
     curl -N http://localhost:8787/api/chat -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"Halo"}]}'
     ```
   - Step 6: Run local eval smoke test (`bunx promptfoo eval -c eval/promptfooconfig.yaml`).

---

### 5. Automated Bidirectional Verification Strategy

We implement `apps/agent/src/__tests__/unit/walkthrough-integrity.test.ts`. This test:
1. **Reads `apps/agent/WALKTHROUGH.md`** and extracts all declared `@walkthrough <stage>.<step>:<slug>` tags.
2. **Scans the codebase** (`apps/agent/src`, `apps/agent/eval`, `apps/agent/db`, `apps/agent/wrangler.toml`) using a unified comment-agnostic regex:
   ```typescript
   const TAG_REGEX = /^[ \t]*(?:\/\*\*|\*|#|--)[ \t]*@walkthrough[ \t]+(\d{2}\.\d{2}:[a-z0-9-]+)/m;
   const TOPIC_REGEX = /^[ \t]*(?:\*|#|--)[ \t]*@topic[ \t]+(.+)$/m;
   const REF_REGEX = /^[ \t]*(?:\*|#|--)[ \t]*@ref[ \t]+(.+)$/m;
   const NOTES_REGEX = /^[ \t]*(?:\*|#|--)[ \t]*@notes[ \t]+(.+)$/m;
   ```
3. **Asserts Bidirectional Parity**:
   - Every tag in `WALKTHROUGH.md` exists in its target source file(s).
   - Every tag found in source files exists in `WALKTHROUGH.md`.
   - Every tag block contains valid non-empty `@topic`, `@ref`, and `@notes` values.
4. **Execution Performance**: Runs in $<100\text{ ms}$ under Vitest without external network calls.

## Risks / Trade-offs

| Risk / Trade-off | Mitigation |
| :--- | :--- |
| **Comment Clutter**: Inline comments could obscure source code logic. | Constrain every `@walkthrough` block to exactly 4-6 lines of structured comments placed directly above the target exported class, function, or configuration section. |
| **Antislop Cleaner Pruning**: Generic comments might get flagged by repository hygiene scripts. | Formatted as formal JSDoc/hash annotations with specific technical attributes (`@walkthrough`, `@topic`, `@ref`, `@notes`), which are recognized as architectural documentation rather than AI slop. |
| **Syntax Errors in Config Files**: Block comments (`/** */`) breaking TOML/YAML parsers. | Strict multi-syntax policy: `#` for TOML/YAML, `--` for SQL, `/** */` for TypeScript. |
| **Tag Drift Over Time**: Moving a file breaks the anchor in `WALKTHROUGH.md`. | Enforced via `apps/agent/src/__tests__/unit/walkthrough-integrity.test.ts` running in `bun run test:agent` in CI. |
