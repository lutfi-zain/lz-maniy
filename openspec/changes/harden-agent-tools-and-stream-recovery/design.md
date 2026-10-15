## Context

See `proposal.md` for background and motivation.

`lz-maniy` operates a multi-step agent loop where Google Gemini 3.8 Flash (via OMP Gateway / Vercel AI SDK) calls financial tools in parallel, followed by Step 2 response synthesis. When handling forward projections, `horizon_projection` currently returns an uncompressed 14-to-24 month dataset duplicating all wallet and goal arrays in every month (>30KB raw JSON), triggering attention breakdown and `finishReason: "MALFORMED_FUNCTION_CALL"`. Additionally, existing tests rely on artificial mock fetch stubs that miss schema validation drift against ReedRich backend contracts.

## Goals / Non-Goals

**Goals:**
- Enforce a strict <3KB payload budget on `horizon_projection` by mapping raw period dumps into a concise monthly trajectory DTO.
- Implement defensive stream recovery in `apps/agent/src/routes/chat.ts`: if the model fails with `MALFORMED_FUNCTION_CALL` after tools have collected data, synthesize a clean final response via single-turn fallback instead of crashing the stream.
- Add contract-driven integration tests (`apps/agent/src/__tests__/integration/reedrich-contract.test.ts`) that strictly enforce parameter validation schemas against ReedRich endpoints.
- Add an end-to-end Playwright smoke test (`apps/web/tests/e2e/live-chat-turn.spec.ts`) asserting that complex forward projection turns complete without `⚠️` or developer error banners.

**Non-Goals:**
- Altering the primary model choice (Gemini 3.8 Flash remains primary).
- Modifying the underlying ReedRich Hyperdrive/PostgreSQL schema.

## Decisions

### 1. Compact Horizon Projection DTO (`apps/agent/src/agent/tools/financial.ts`)
**Decision**: Transform raw `/api/v1/analytics/horizon` responses into a streamlined trajectory DTO:
```ts
return {
  baseCurrency: raw.baseCurrency,
  startingNetWorth: raw.startingNetWorth,
  periods: (raw.periods || []).map((p) => ({
    periodKey: p.periodKey,
    startDate: p.startDate ? p.startDate.split('T')[0] : undefined,
    endDate: p.endDate ? p.endDate.split('T')[0] : undefined,
    cashflow: {
      income: p.cashflow?.income ?? 0,
      expense: p.cashflow?.expense ?? 0,
      netSpendable: p.cashflow?.netSpendable ?? 0,
      netLocked: p.cashflow?.netLocked ?? 0
    },
    trajectory: {
      spendableNetWorth: p.netWorth?.spendable ?? 0,
      lockedNetWorth: p.netWorth?.locked ?? 0,
      totalNetWorth: p.netWorth?.total ?? 0
    },
    milestones: (p.goals || [])
      .filter((g) => g.milestoneStatus === 'reached' || g.isCompleted)
      .map((g) => ({ name: g.goalName, target: g.targetAmount }))
  }))
};
```
*Rationale*: Eliminates 112+ redundant wallet objects across 14 months, shrinking payload from ~32KB to ~1.8KB while preserving all necessary cashflow and runway data needed to answer purchase timing questions.

### 2. Defensive Stream Recovery Architecture (`apps/agent/src/routes/chat.ts`)
**Decision**: In `chat.ts`, track tool invocation results in an in-memory array (`capturedToolResults`). In the stream error catch block:
- If the error message includes `MALFORMED_FUNCTION_CALL` and `capturedToolResults.length > 0`:
  1. Record an observability notice on the span.
  2. Invoke a text-only recovery completion (`generateText` with `toolChoice: 'none'`) grounding on the already-fetched tool results.
  3. Stream the synthesized text into the active user response stream.
  4. Only if recovery itself fails, emit a polite user-facing error message without raw developer keywords.

### 3. Contract-Driven Testing Without Synthetic Mocks (`reedrich-contract.test.ts`)
**Decision**: In `apps/agent/src/__tests__/integration/reedrich-contract.test.ts`, create a contract validation harness that validates outgoing tool requests against exact ReedRich parameter rules:
- `orderBy` must strictly be one of `date`, `amount`, `createdAt`, `description`.
- `direction` must be `asc` or `desc`.
- Truncated dates (`YYYY-MM`) must be normalized to valid ISO dates.
- Reject any tool call emitting unmapped composite strings (`date_desc`, `amount_desc`).

### 4. Live Agent Playwright E2E Suite (`live-chat-turn.spec.ts`)
**Decision**: Add an automated integration test in `apps/web/tests/e2e/live-chat-turn.spec.ts` that:
- Submits the multi-step forward projection prompt: `"kalau saya mau beli mobil lagi tahun depan dengan DP50 juta bisa di bulan apa idealnya?"`.
- Asserts that the response completes with status 200.
- Asserts that the rendered chat bubble contains no `⚠️` or `MALFORMED` error text, and mentions a specific month and Rupiah calculation.

## Architecture Data Flow

```
User Query: "Beli mobil DP 50 Jt tahun depan"
        │
        ▼
   POST /api/chat (Step 1)
        │
        ├──► Tool Calling: get_snapshot, horizon_projection, etc.
        │         │
        │         ▼
        │    Compact DTO (<3KB clean trajectory)
        │
        ▼
   Step 2 Synthesis (LLM Continuation)
        │
        ├──► Normal Path: Gemini streams final answer
        │
        └──► If MALFORMED_FUNCTION_CALL occurs:
                  │
                  ▼
             Defensive Recovery Handler
             (Single-turn text completion over in-memory tool results)
                  │
                  ▼
             Stream synthesized text to user (No ⚠️ Error!)
```

## Risks / Trade-offs

- **Risk: Loss of per-wallet monthly granularity in horizon.**
  - *Mitigation*: Current wallet balances are already provided by `get_snapshot`. Forward projections only require total spendable vs locked net worth trajectory, which is fully preserved.
- **Risk: Additional latency if recovery step triggers.**
  - *Mitigation*: Recovery only triggers on provider failure, converting what would have been a 100% broken user experience into a successful, grounded answer in ~2-3 seconds.
