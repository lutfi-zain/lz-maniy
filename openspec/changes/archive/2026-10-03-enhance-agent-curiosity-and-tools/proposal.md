# Proposal

## Why

Eve agent covers only 20% (8 of 40) Reedrich REST API v1.17.0 endpoints, lacks 7 tools in the Gemini native runner vs the AI SDK path, and has a passive system prompt that waits for user queries instead of proactively gathering data and verifying mutations. Analysis of 45 days of real OMP-FinnPlan usage (256 user messages, 694 tool calls) reveals the most-called Reedrich capabilities — wallet management (156 calls), debt/loan tracking (25 calls), goal management (21 calls), budget management (16 calls), recurring templates (16 calls) — are completely absent from Eve. The model dropdown also exposes 8 legacy/redundant Gemini variants and untested Groq models that confuse users without adding value.

## What Changes

- **Expand Reedrich REST tools** from 8 to ~25, adding full CRUD for wallets, categories, budgets, debts/loans, goals, and recurring templates, plus `financial_summary`, `horizon_projection`, `submit_feedback`, and `apply_recurring_template` endpoints.
- **Rewrite system prompt** with a curiosity-first design: data-first retrieval before answering, verify-after-mutate pattern, multi-step reasoning chains for planning queries, proactive insight delivery, and explicit error/confirmation protocols.
- **Achieve Gemini native runner tool parity**: register all tools in `gemini-native.ts` `toolDeclarations` and `executeTool` switch, matching the AI SDK tool set exactly.
- **Trim model list** from 11 to 6 proven models, removing superseded Gemini variants (3.5, 3.6, flash-lite-latest) and niche Groq models (qwen3.8-27b). Sync `AVAILABLE_MODELS` (backend) and `DEFAULT_MODELS` (shared).
- **Add agent memory context injection**: inject user's wallet registry, cashflow patterns, and formatting preferences into the system prompt dynamic section, sourced from persisted user settings or a new `agentMemory` field.

## Capabilities

### New Capabilities

- `agent-chat/agent-memory`: User-specific memory persistence (wallet nicknames, cashflow patterns, formatting preferences) injected into system prompt context.

### Modified Capabilities

- `agent-chat/backend`: Add 17 new REST API tools, rewrite system prompt with curiosity-first patterns, achieve Gemini native tool parity.
- `agent-chat/shared-types`: Add new tool parameter/result types, update `ModelConfig` list to remove deprecated models, add `AgentMemory` type.
- `agent-chat/infra`: Update wrangler.toml bindings if new KV namespace required for agent memory.

## Non-Goals

- Frontend UI changes to the chat panel (model picker will update automatically via `/api/models` endpoint).
- New frontend pages or components.
- Changes to OAuth/auth flow.
- Reedrich API changes (consuming existing REST API as-is).
- Chat history migration or schema changes.
