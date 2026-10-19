## Why

Building modern production AI agents requires mastering a multi-layered stack: Cloudflare Workers edge runtime, Vercel AI SDK provider routing, streaming protocols, Zod parameterized tool calling, dynamic token compaction, and an end-to-end evaluation pyramid (from Level 0 deterministic assertions to asynchronous LLM-as-a-judge and closed-loop dataset flywheels). While `apps/agent` in this repository already implements these enterprise patterns, developers and autonomous coding agents lack a structured, step-by-step curriculum to traverse, understand, and replicate this architecture when scaffolding a new AI agent from scratch.

External documentation quickly drifts and gets outdated. By embedding standardized `@walkthrough` code annotations directly above production implementations and anchoring them in a central `apps/agent/WALKTHROUGH.md` curriculum aligned with the official [roadmap.sh/ai-engineer](https://roadmap.sh/ai-engineer) standard, we establish an executable, always-synchronized blueprint that enables 5-minute agent replication with zero doc bloat.

## What Changes

- **Master Curriculum Blueprint (`apps/agent/WALKTHROUGH.md`)**:
  - A lightweight master index table mapping every milestone of the AI Engineer roadmap to exact source files, function anchors, theoretical summaries, dual reference links (public documentation and internal Donna OKF vault modules), and reproducible scaffolding recipes.
  - Covers 6 sequential stages:
    1. *Stage 01: Foundations & Edge Runtime* (Cloudflare Workers, Hono, TypeScript, Secrets)
    2. *Stage 02: Providers & Streaming Protocol* (Vercel AI SDK, Gemini/Groq/OpenAI, SSE streaming, Fallback)
    3. *Stage 03: Prompt Engineering & Parameterized Tools* (SSOT prompts, Zod tool calling, security boundaries)
    4. *Stage 04: Context Window Management & Agent Memory* (History sanitization, token compaction, D1 long-term memory)
    5. *Stage 05: The AI Evaluation Pyramid (All Levels)* strictly sequenced:
       - `05.01:eval-code-grounding`: Level 0 Deterministic Invariants & Formatting (`evaluators.ts`)
       - `05.02:async-llm-judge`: Level 1 Decoupled Semantic LLM-as-a-Judge & D1 Queue (`async-judge.ts`, `routes/eval.ts`, `0006_eval_flywheel.sql`)
       - `05.03:eval-promptfoo-gate`: Level 2 Pre-Deploy CI Matrix Gate (`promptfooconfig.yaml`, `grader.ts`)
       - `05.04:eval-phoenix-suite`: Level 3 Offline Phoenix Experimentation & Golden Datasets (`phoenix-suite.ts`, `dataset.ts`)
       - `05.05:eval-otel-tracing`: Level 4 Distributed Tracing & Telemetry (`tracer.ts`, `middleware/tracing.ts`)
       - `05.06:pii-scrubber`: Data Governance: 4-Pass PII Scrubber (`pii-scrubber.ts`)
       - `05.07:dataset-flywheel`: Closed-Loop Flywheel: Production Failures to CI Golden Dataset (`flywheel.ts`, `flywheel-sync.ts`, `queries.ts`)
    6. *Stage 06: New Agent Replication Recipe* (5-minute checklist, minimal 6-file manifest, and smoke test to scaffold a clean new agent)

- **Standardized Multi-Syntax Inline Annotations (`@walkthrough`)**:
  - Annotate key production and evaluation files across `apps/agent/src/`, `apps/agent/eval/`, `apps/agent/db/`, and root configs with structured, compact comment tags.
  - Multi-syntax grammar:
    - TypeScript: JSDoc `/** @walkthrough <stage>.<step>:<slug> ... */`
    - TOML / YAML: Hash comments `# @walkthrough <stage>.<step>:<slug> ...`
    - SQL: Dash comments `-- @walkthrough <stage>.<step>:<slug> ...`
  - Strict tagging attributes:
    - `@walkthrough <stage>.<step>:<slug>` (zero-padded 2-digit identifiers ensuring strict chronological sorting in `grep` and GitHub search).
    - `@topic <roadmap-topic-name>`
    - `@ref <public-docs-url> | <okf-vault-path>` (dual reference).
    - `@notes <concise-concept-summary>` (1-2 sentences of self-contained technical explanation so readers do not have to open external links for core concepts).

- **Bidirectional Verification & Integrity Test (`apps/agent/src/__tests__/unit/walkthrough-integrity.test.ts`)**:
  - Enforces bidirectional parity in `bun run test:agent`:
    1. Every tag declared in `WALKTHROUGH.md` exists in target source files.
    2. Every tag present in `src/`, `eval/`, or configs is registered in `WALKTHROUGH.md` (zero orphan tags or typos).
    3. Every tag block contains valid non-empty `@topic`, `@ref`, and `@notes` attributes.

### Scope Boundaries

- **In-Scope**:
  - Creating `apps/agent/WALKTHROUGH.md` with full 6-stage architecture, index table, and 5-minute replication guide.
  - Adding non-intrusive comment tags across TypeScript, YAML, TOML, and SQL files in `apps/agent`.
  - Adding dual references (`okf://knowledge/ai-evals-course/...`, `okf://knowledge/langfuse-vercel-ai-sdk/...`, and official docs) with inline concept summaries.
  - Automated bidirectional integrity unit test.
- **Non-Goals**:
  - Modifying underlying agent runtime logic or altering production endpoints.
  - Creating verbose separate markdown articles that duplicate code (code comments remain concise, max 5-6 lines per tag).
  - Modifying the frontend application in `apps/web`.

## Capabilities

### New Capabilities
- `walkthrough-curriculum`: Standardized code-as-curriculum annotations and master roadmap index in `apps/agent` providing structured end-to-end guidance for AI Engineering, runtime architecture, and multi-tier evaluation.

### Modified Capabilities
*(None. Existing runtime capabilities remain unchanged.)*

## Impact

- **Developer & Agent Experience**: Developers and AI coding agents can run `grep -rn "@walkthrough 05" apps/agent/` to inspect all evaluation layers sequentially or follow `WALKTHROUGH.md` to replicate a new agent in 5 minutes.
- **Maintainability & Zero Code Drift**: Walkthrough tags reside in active, tested code. Lint and unit tests guarantee annotations remain valid and bidirectional.
- **Code Cleanliness**: Adheres strictly to repository cleanliness rules; no emoji slop, no syntax conflicts in config files, no long rambling essays in source files.
