## Context

See `proposal.md` for background and motivation.

Currently, `WorkerTracer` (`apps/agent/src/observability/tracer.ts`) successfully broadcasts OpenTelemetry Protobuf traces to both Arize Phoenix and Langfuse Cloud concurrently. However, two parity gaps exist:
1. **Live Session Grouping**: Arize Phoenix strictly indexes conversation sessions from `session.id` on the root server span (`HTTP POST /api/chat`). In `apps/agent/src/routes/chat.ts`, `activeConvId` was only assigned to child spans (`contextRetrieval`, `db.insertMessage`) under the non-standard key `conversation.id`. Consequently, Phoenix registers only an old static session (`conv_production_001`), while Langfuse groups sessions because it reads `langfuse.session.id` from child spans.
2. **Asset Inventory Asymmetry**: `apps/agent/eval/phoenix-suite.ts` populates Phoenix Prompt Hub and Phoenix Datasets via direct SQL/API calls. Langfuse Prompt Management and Datasets remain completely unpopulated.

## Goals / Non-Goals

**Goals:**
- Guarantee 1:1 parity between Arize Phoenix and Langfuse for all live conversation sessions.
- Normalize `session.id`, `conversation.id`, and `langfuse.session.id` so setting any of them automatically sets all three across root and child spans.
- Create a unified dual-asset synchronization workflow (`apps/agent/eval/observability-sync.ts`) that uploads prompts (`system-baseline`, `system-compact`, `system-fewshot`) and the 16 golden test cases (`EVAL_DATASET`) to both Phoenix and Langfuse.
- Ensure Promptfoo and eval test runs tag traces with consistent dataset and experiment identifiers.
- Maintain zero secret credentials in tracked files, validated by `bun scripts/check-secrets.ts`.

**Non-Goals:**
- Migrating historical Phoenix database rows into Langfuse (both platforms start live 1:1 mirroring from this release forward).
- Introducing heavyweight third-party SDK dependencies into the Cloudflare Worker runtime.

## Decisions

### 1. Root Span Session Decoration in `chat.ts`
**Decision**: In `apps/agent/src/routes/chat.ts`, set `user.id` immediately after authentication and set `session.id` immediately after `activeConvId` is resolved:
```ts
tracer?.rootSpan?.setAttribute('user.id', user.userId);
tracer?.rootSpan?.setAttribute('session.id', activeConvId);
tracer?.rootSpan?.setAttribute('conversation.id', activeConvId);
```
**Rationale**: Satisfies Arize Phoenix's requirement for root span session indexing while feeding Langfuse's session aggregator.

### 2. Bidirectional Attribute Normalization in `WorkerSpan`
**Decision**: In `apps/agent/src/observability/tracer.ts`, update `WorkerSpan.setAttribute`:
```ts
if (key === 'user.id') {
  this.attributes['user.id'] = value;
  this.attributes['langfuse.user.id'] = value;
}
if (key === 'conversation.id' || key === 'session.id') {
  this.attributes['session.id'] = value;
  this.attributes['conversation.id'] = value;
  this.attributes['langfuse.session.id'] = value;
}
```
**Rationale**: Eliminates semantic drift across internal codebase conventions and external APM schemas.

### 3. Unified Asset Synchronization Suite (`eval/observability-sync.ts`)
**Decision**: Implement `apps/agent/eval/observability-sync.ts` that:
1. Calls existing Phoenix sync logic (`phoenix-suite.ts`).
2. Calls Langfuse REST API (`POST /api/public/v2/prompts`, `POST /api/public/v2/datasets`, and `POST /api/public/dataset-items`):
   - Creates prompts: `system-baseline`, `system-compact`, `system-fewshot`.
   - Creates dataset: `maniyy-agent-golden-dataset` with 16 items from `EVAL_DATASET`.
3. Exposes script command `bun run observability:sync` in `apps/agent/package.json`.

### 4. Zero Secrets Guarantee
**Decision**: Secrets are strictly read from `process.env` / `c.env` (`PHOENIX_API_KEY`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`). No credentials are committed to version control.

## System Flow Diagram

```
+-------------------------------------------------------------------------+
|                        Unified Observability Sync                       |
|                   `bun run observability:sync`                          |
+--------------------+-------------------------------+--------------------+
                     |                               |
                     v                               v
          +---------------------+         +---------------------+
          |    Phoenix Hub      |         |   Langfuse Prompts  |
          |  & Phoenix Datasets |         |  & Langfuse Datasets|
          +---------------------+         +---------------------+
```

## Risks / Trade-offs

- **Risk: Duplicate dataset creation in Langfuse on repeated sync runs.**
  - *Mitigation*: The sync script checks for existing dataset name `maniyy-agent-golden-dataset` and uses idempotent `POST /api/public/dataset-items` matching item IDs (`TC-01` through `TC-16`).
