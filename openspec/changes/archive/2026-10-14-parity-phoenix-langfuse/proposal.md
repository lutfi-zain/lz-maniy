## Why

Arize Phoenix and Langfuse Cloud must operate as identical twins with 100% data, session, and asset parity. Currently, multi-turn conversation sessions appear in Langfuse but fail to group in Phoenix because `session.id` was omitted from the root HTTP span, and evaluation assets (prompts and golden datasets) exist only in Phoenix rather than being mirrored to Langfuse. Achieving enterprise parity eliminates monitoring drift and ensures both platforms provide identical visibility.

## What Changes

- **Root Span Session & User Parity**: Set `session.id` and `user.id` on `tracer.rootSpan` in `apps/agent/src/routes/chat.ts` immediately after `conversationId` and authenticated `user` are resolved.
- **Bidirectional Attribute Aliasing**: Update `WorkerSpan.setAttribute` in `apps/agent/src/observability/tracer.ts` so setting `conversation.id` or `session.id` automatically sets `session.id`, `conversation.id`, and `langfuse.session.id` on all spans.
- **Dual-Asset Synchronization Script**: Enhance the asset sync suite (`eval/observability-sync.ts` / `phoenix:sync`) to synchronize prompt templates (`system-baseline`, `system-compact`, `system-fewshot`) and the 16-case golden dataset (`EVAL_DATASET` from `eval/dataset.ts`) to both Phoenix Prompt Hub/Datasets and Langfuse Prompts/Datasets.
- **Experiment & Benchmark Run Mirroring**: Ensure evaluation runs executed via Promptfoo or Vitest export scores and trace linkage to both Phoenix Experiments and Langfuse Dataset Runs.
- **Strict Credential Hygiene**: Ensure all asset synchronization scripts read keys from environment variables (`PHOENIX_API_KEY`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`) with zero secrets hardcoded in git.

## Capabilities

### New Capabilities
<!-- None: this change extends existing agent-observability capability. -->

### Modified Capabilities
- `agent-observability`: Enforce 1:1 dual-mirror parity for root span session indexing, prompt version synchronization, and golden evaluation datasets between Arize Phoenix and Langfuse.

## Impact

- **Affected Systems**: `apps/agent/src/routes/chat.ts`, `apps/agent/src/observability/tracer.ts`, `apps/agent/eval/phoenix-suite.ts` (or new unified `eval/observability-sync.ts`), `apps/agent/package.json`.
- **Breaking Changes**: None. Backwards compatible with existing Phoenix and Langfuse ingestion pipelines.
