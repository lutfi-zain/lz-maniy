## Purpose

The `walkthrough-curriculum` capability provides a standardized, executable code-as-curriculum blueprint in `apps/agent` aligned with the roadmap.sh AI Engineer standard. It enables developers and autonomous AI agents to learn, navigate, and replicate production-grade AI agent architecture and the full 5-tier evaluation pyramid with zero documentation drift.

## Requirements

### Requirement: Master Curriculum Document Structure

The system SHALL provide a central curriculum index file at `apps/agent/WALKTHROUGH.md` that maps the AI Engineer roadmap to the codebase using a structured markdown matrix.

#### Scenario: Developer or Agent Traverses Chronological Stages
- **WHEN** a developer or coding agent reads `apps/agent/WALKTHROUGH.md`
- **THEN** they receive a sequentially ordered 6-stage curriculum (01 Foundations, 02 Providers & Streaming, 03 Prompts & Tools, 04 Context & Memory, 05 AI Evaluation Pyramid, 06 Replication Recipe) where each step points to an exact relative file path and anchor tag.

#### Scenario: Lookup by AI Evaluation Tier
- **WHEN** a developer inspects the evaluation section of `WALKTHROUGH.md`
- **THEN** all 5 levels of the evaluation pyramid (Level 0 Deterministic, Level 1 Model-Graded Async Judge, Level 2 Promptfoo CI Gate, Level 3 Phoenix Experiments, Level 4 Langfuse/OTel Telemetry) plus PII Sanitization and Closed-Loop Flywheel are mapped in sequential order (`05.01` to `05.07`) with exact file anchors and operational commands.

#### Scenario: Replicating a New Agent from Scratch
- **WHEN** a developer executes Stage 06 ("New Agent Replication Recipe")
- **THEN** they are provided with a minimal, reproducible checklist of files and scaffolding commands required to bootstrap an independent AI agent with identical runtime resilience and evaluation harness.

---

### Requirement: Standardized Multi-Syntax Tagging Grammar

All curriculum anchors across TypeScript, configuration, and migration files SHALL adhere to a strict, standardized annotation grammar that guarantees lexicographical sorting and self-contained understanding without introducing file syntax errors.

#### Scenario: Lexicographical Chronological Grep
- **WHEN** a developer runs a standard text search such as `grep -rn "@walkthrough" apps/agent/src apps/agent/eval apps/agent/db apps/agent/*.toml | sort`
- **THEN** all discovered anchors sort in strict sequential order from `01.01` to `06.01` without out-of-order jumps caused by unpadded numbers.

#### Scenario: Multi-Syntax Comment Adaptability
- **WHEN** curriculum tags are placed in non-TypeScript files (e.g. `wrangler.toml`, `eval/promptfooconfig.yaml`, `db/migrations/*.sql`)
- **THEN** the tags use file-native comment syntax (hash `# @walkthrough ...` for TOML/YAML, dash `-- @walkthrough ...` for SQL, and JSDoc `/** @walkthrough ... */` for TypeScript) preserving tag parseability without causing runtime or build parse errors.

#### Scenario: Self-Contained Concept Understanding Without External Links
- **WHEN** a developer or LLM inspects a `@walkthrough` block in source code
- **THEN** the tag provides an `@notes` field with a self-contained 1-2 sentence technical summary explaining the architectural rationale, so understanding does not strictly require opening external URLs.

#### Scenario: Dual Reference Citation
- **WHEN** a developer inspects the `@ref` field of a `@walkthrough` block
- **THEN** the tag provides both an authoritative public documentation URL and an internal OKF knowledge vault URI (`okf://knowledge/...`) where applicable.

---

### Requirement: Architecture & Runtime Curriculum Coverage (Stages 01 - 04)

The curriculum SHALL map core AI engineering architecture across runtime, provider abstraction, tool invocation, and context window management.

#### Scenario: Stage 01 Foundations and Edge Runtime Anchors
- **WHEN** inspecting `@walkthrough 01.01:worker-entrypoint`, `01.02:environment-bindings`, and `01.03:hono-routing-layer`
- **THEN** the developer observes Cloudflare Workers execution lifecycle (`fetch` and `scheduled`), strict TypeScript environment bindings, and Hono routing with middleware chaining.

#### Scenario: Stage 02 Multi-Provider and Edge Streaming Anchors
- **WHEN** inspecting `@walkthrough 02.01:multi-provider-model`, `02.02:edge-sse-streaming`, and `02.03:resilient-fallback`
- **THEN** the developer observes Vercel AI SDK provider routing (Gemini, Groq, OpenAI), Server-Sent Events (SSE) streaming protocols, and deterministic fallback synthesis.

#### Scenario: Stage 03 Prompt Engineering and Parameterized Tool Anchors
- **WHEN** inspecting `@walkthrough 03.01:system-prompt-ssot`, `03.02:zod-tool-definition`, and `03.03:tool-execution-guard`
- **THEN** the developer observes dynamic few-shot prompt construction, Zod schema parameter validation, and multi-tenant security isolation.

#### Scenario: Stage 04 Context Compaction and Long-Term Memory Anchors
- **WHEN** inspecting `@walkthrough 04.01:history-sanitization`, `04.02:token-compaction`, and `04.03:long-term-memory`
- **THEN** the developer observes conversational role normalization across models, token budget pruning, and persistent D1 user memory storage.

---

### Requirement: End-to-End Evaluation Pyramid Coverage (Stage 05)

The curriculum SHALL cover all 5 tiers of AI evaluation implemented in the agent codebase in strict hierarchical order, demonstrating both in-band deterministic checks and decoupled out-of-band semantic governance.

#### Scenario: Level 0 Deterministic Code Evaluation Anchor
- **WHEN** inspecting `@walkthrough 05.01:eval-code-grounding` in `apps/agent/src/observability/evaluators.ts`
- **THEN** the developer observes deterministic regex and schema checks (numeric grounding, currency formatting, emoji prevention) that run synchronously with zero added token cost.

#### Scenario: Level 1 Decoupled Asynchronous Judge Anchor
- **WHEN** inspecting `@walkthrough 05.02:async-llm-judge` in `apps/agent/src/observability/async-judge.ts`, `apps/agent/src/routes/eval.ts`, and `apps/agent/db/migrations/0006_eval_flywheel.sql`
- **THEN** the developer observes how model-graded semantic evaluations run out-of-band via D1 queue leasing and Worker cron to avoid edge subrequest and CPU limits.

#### Scenario: Level 2 Pre-Deployment CI Evaluation Gate Anchor
- **WHEN** inspecting `@walkthrough 05.03:eval-promptfoo-gate` in `apps/agent/eval/promptfooconfig.yaml` and `apps/agent/eval/grader.ts`
- **THEN** the developer observes the matrix evaluation runner (multi-prompt x multi-model) and the CI gate blocking release if pass rate drops below 95%.

#### Scenario: Level 3 Offline Experimentation and Golden Dataset Anchor
- **WHEN** inspecting `@walkthrough 05.04:eval-phoenix-suite` in `apps/agent/eval/phoenix-suite.ts` and `apps/agent/eval/dataset.ts`
- **THEN** the developer observes Arize Phoenix offline benchmark comparisons, prompt version repositories, and the 14-category golden dataset taxonomy.

#### Scenario: Level 4 Distributed Tracing and Post-Production Telemetry Anchor
- **WHEN** inspecting `@walkthrough 05.05:eval-otel-tracing` in `apps/agent/src/observability/tracer.ts` and `apps/agent/src/middleware/tracing.ts`
- **THEN** the developer observes OpenInference semantic spans, W3C traceparent header propagation, and non-blocking production telemetry streaming to Langfuse and Phoenix.

#### Scenario: 4-Pass PII Scrubber Anchor
- **WHEN** inspecting `@walkthrough 05.06:pii-scrubber` in `apps/agent/src/observability/pii-scrubber.ts`
- **THEN** the developer observes the deterministic sanitization algorithm that scrubs credentials, NIK, bank accounts, and emails while preserving monetary math amounts.

#### Scenario: Closed-Loop Flywheel Anchor
- **WHEN** inspecting `@walkthrough 05.07:dataset-flywheel` in `apps/agent/src/observability/flywheel.ts`, `apps/agent/eval/flywheel-sync.ts`, and `apps/agent/src/db/queries.ts`
- **THEN** the developer observes how production failures are staged into D1 and exported via `bun run eval:export-candidates` into CI regression test cases in `apps/agent/eval/dataset.ts`.

---

### Requirement: 5-Minute Agent Replication Recipe (Stage 06)

The curriculum SHALL provide a minimal, self-contained replication blueprint allowing an engineer or autonomous coding agent to scaffold a production-ready agent in 5 minutes.

#### Scenario: Minimal File Manifest Provisioning
- **WHEN** executing the replication guide in `apps/agent/WALKTHROUGH.md`
- **THEN** the guide provides copy-ready templates for the bare-minimum 6 files: `package.json`, `wrangler.toml`, `src/index.ts`, `src/agent/models.ts`, `src/routes/chat.ts`, and `eval/promptfooconfig.yaml`.

#### Scenario: Reproducible Bootstrap & Smoke Verification
- **WHEN** following the step-by-step CLI instructions (`bun install` -> `wrangler dev` -> curl chat payload)
- **THEN** the new agent starts locally, streams SSE tokens, and passes the Level 0 deterministic smoke test in under 30 seconds.

---

### Requirement: Bidirectional Walkthrough Tag Integrity Verification

The repository test suite SHALL verify bidirectional structural integrity of walkthrough annotations to prevent tag drift, missing references, or malformed slugs.

#### Scenario: Bidirectional Walkthrough Tag Integrity Assertion
- **WHEN** `bun run test:agent` executes `apps/agent/src/__tests__/unit/walkthrough-integrity.test.ts`
- **THEN** the test asserts bidirectional parity:
  1. Every `@walkthrough` tag indexed in `apps/agent/WALKTHROUGH.md` exists in its referenced source file(s).
  2. Every `@walkthrough` tag present across `apps/agent/src`, `apps/agent/eval`, `apps/agent/db`, and config files is registered in `WALKTHROUGH.md`.
  3. Every tag block contains valid non-empty `@topic`, `@ref`, and `@notes` attributes.
