# Proposal: Synchronize Production System Prompt Across Promptfoo, Arize Phoenix, and Langfuse

## Why

While the production AI financial agent system prompt in `apps/agent/src/agent/system-prompt.ts` was recently modernized with an Intent-to-Tool Decision Matrix, $T=0/T<0/T+1/T>1\dots 24$ temporal routing, and mandatory `horizon_projection` guidelines, the prompt evaluation and LLMOps suites in `apps/agent/eval/prompts/` (`system-baseline.txt`, `system-compact.txt`, and `system-fewshot.txt`) remain out-of-date. Consequently, Promptfoo evaluation benchmarks, Arize Phoenix prompt repositories, and Langfuse prompt registries are evaluating and serving stale prompt text from prior iterations.

Synchronizing the canonical production system prompt across all three LLMOps evaluation layers (Promptfoo, Arize Phoenix, and Langfuse Cloud) establishes a true Single Source of Truth (SSOT), prevents prompt drift, and guarantees that automated evaluations test the exact reasoning heuristics used in production.

## What Changes

- **Synchronize Prompt Variants (`apps/agent/eval/prompts/`)**:
  - Update `system-baseline.txt` with the full canonical system prompt matching `system-prompt.ts` 1:1 (Intent-to-Tool Decision Matrix, curiosity protocol, accounting invariants, and Markdown trajectory tables).
  - Update `system-compact.txt` with a token-compact (<500 tokens) variant retaining core temporal routing heuristics and hard negative constraints.
  - Update `system-fewshot.txt` with a representative few-shot example demonstrating `horizon_projection` invocation for multi-month horizon queries (e.g. laptop purchasing feasibility).
- **Arize Phoenix LLMOps Synchronization (`phoenix-suite.ts`)**:
  - Synchronize prompt versions in the `maniy-agent-system` prompt repository with updated version tags (`v1.15.0`, `baseline`, `compact`, `fewshot`) and metadata.
- **Langfuse Cloud Prompt Registry Synchronization (`observability-sync.ts`)**:
  - Push updated prompt versions to Langfuse Cloud (`/api/public/v2/prompts`) under labels `production`, `baseline`, and `staging`, tagged with `['decision-matrix-v115', 'maniy-agent', 'horizon-aware']`.
- **Evaluation Runner Verification**:
  - Execute `bun run test:agent` and verify that Promptfoo benchmark tests in `eval/promptfoo-tests.yaml` and Phoenix/Langfuse sync scripts execute with 100% parity and zero failures.

## Capabilities

### New Capabilities
*(None; this refactoring synchronizes prompt definitions across existing evaluation frameworks.)*

### Modified Capabilities
- `agent-eval`: Update the A/B matrix benchmarking and synchronization requirements to mandate that local prompt variants in `prompts/*.txt` strictly mirror production prompt heuristics and sync to both Arize Phoenix and Langfuse with zero prompt drift.

## Impact

- **Affected Code**:
  - `apps/agent/eval/prompts/system-baseline.txt`
  - `apps/agent/eval/prompts/system-compact.txt`
  - `apps/agent/eval/prompts/system-fewshot.txt`
  - `apps/agent/eval/phoenix-suite.ts`
  - `apps/agent/eval/observability-sync.ts`
- **Observability Parity**: Eliminates discrepancies between what is logged/evaluated in Phoenix & Langfuse and what runs in Cloudflare Workers production.
- **Evaluation Quality**: Ensures Promptfoo benchmarks and LLM judges grade responses based on the current Decision Matrix and `horizon_projection` protocols.
