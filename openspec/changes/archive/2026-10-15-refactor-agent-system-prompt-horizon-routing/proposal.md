# Proposal: Refactor Agent System Prompt & Horizon Routing via Context Engineering

## Why

The current AI financial agent (`Eve`) exhibits a critical behavioral blind spot: while the `horizon_projection` tool is registered in the backend runtime to call Reedrich's multi-period roll-forward engine (`GET /api/v1/analytics/horizon`), the system prompt in `apps/agent/src/agent/system-prompt.ts` relegates it to a single-line mention and explicitly instructs the model to perform manual arithmetic via `get_snapshot` and `list_transactions` for future projections. Furthermore, the system prompt wastes over 1,200 tokens duplicating 30+ tool definitions that are already natively provided to the LLM as function declarations. 

Applying enterprise context engineering standards (Anthropic September 2025 guidelines and Berkeley Function Calling Leaderboard best practices) will eliminate prompt redundancy, recover token attention budget, and establish a discriminative Intent-to-Tool routing matrix that routes multi-period forecasting, runway simulations, and savings milestone queries directly to `horizon_projection`.

## What Changes

- **Eliminate Dual-Catalog Redundancy**: Remove the redundant ~1,200-token plain-text catalog (`buildToolCatalog`) from `apps/agent/src/agent/system-prompt.ts`, relying on native LLM tool definitions injected via Vercel AI SDK and Gemini native declarations.
- **Implement Intent-to-Tool Routing Matrix**: Replace the unstructured tool listing with a structured Decision Heuristics Matrix categorizing tools across temporal dimensions:
  - *Current Position (T = 0)*: `get_snapshot` & `financial_summary`.
  - *Historical Audit (T < 0)*: `list_transactions`.
  - *Single-Period Micro Plans (T + 1 Month)*: `get_snapshot` + `list_transactions` (planned).
  - *Multi-Period Macro Forecast & Milestones (T > 1 to 24 Months)*: Mandatory `horizon_projection`.
- **Discriminative Tool Guidance**: Refine the description of `horizon_projection` in `apps/agent/src/agent/tools/financial.ts` with explicit negative constraints stating when to use it (multi-period runway, milestone timelines, net worth trajectory) and when to avoid it (single-transaction queries).
- **Standardized Horizon Synthesis Protocol**: Add formatting and synthesis rules instructing the agent to render compact horizon projection results into structured Markdown trajectory tables with milestone flags.
- **Evaluation Hardening**: Update Promptfoo test cases (`[TC-35]`) and Vitest unit tests to strictly assert that multi-period forecasting prompts trigger `horizon_projection` rather than falling back to `get_snapshot`.

## Capabilities

### New Capabilities
*(None; this refactoring optimizes routing and system prompt architecture of existing agent capabilities.)*

### Modified Capabilities
- `agent-chat/backend`: Update system prompt requirements to mandate context-engineered intent routing, ban redundant in-prompt function catalogs, and require deterministic invocation of `horizon_projection` for multi-period trajectory and milestone inquiries.

## Impact

- **Affected Code**:
  - `apps/agent/src/agent/system-prompt.ts` (rewrite catalog and routing heuristics).
  - `apps/agent/src/agent/tools/financial.ts` (refine `horizon_projection` discriminative tool description).
  - `apps/agent/src/agent/__tests__/system-prompt.test.ts` (test cases for routing matrix and temporal invariants).
  - `apps/agent/eval/promptfoo-tests.yaml` (tighten assertion for TC-35).
- **Token Efficiency**: Reduces system prompt overhead by ~1,000 tokens per request, lowering Time-to-First-Token (TTFT) latency on Cloudflare Workers.
- **Accuracy**: Eliminates LLM calculation hallucination on multi-month forecasting by delegating roll-forward computations exclusively to the deterministic D1 engine.
