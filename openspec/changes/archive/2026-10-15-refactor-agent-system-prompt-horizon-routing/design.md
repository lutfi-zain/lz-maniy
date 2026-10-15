# Technical Design: Agent System Prompt & Horizon Routing Refactor

## Context

See `proposal.md` for background and motivation.

Currently, `apps/agent/src/agent/system-prompt.ts` generates a monolithic text prompt containing:
1. `buildIdentitySection` (persona & role)
2. `buildTemporalSection` (dynamic WIB system clock & month bounds)
3. `buildMemorySection` (D1 agent memory)
4. `buildPageContextSection` (Level 2 UI awareness)
5. `statementSummary` (bank statement session context)
6. `buildToolCatalog` (verbose ~1,200 token prose listing 30+ tools)
7. `buildBehaviorProtocol` (curiosity principles, confirmation gates, error handling)
8. `buildAccountingPrinciples` (net worth invariants, multi-currency, manual planned calculations)
9. `buildCommunicationStyle` (formatting guidelines)

In both the Vercel AI SDK execution path (`apps/agent/src/routes/chat.ts`) and the Gemini native execution path (`apps/agent/src/agent/gemini-native.ts`), all tool schemas are already provided as native function declarations (`toolDeclarations` / `tools`). The textual `buildToolCatalog` is 100% redundant, creating a heavy attention tax (~1,200 tokens) and causing tool selection blindness. In particular, `horizon_projection` is never invoked for forecasting queries because `buildBehaviorProtocol` explicitly directs the model to perform manual arithmetic via `get_snapshot` and `list_transactions`.

## Goals / Non-Goals

**Goals:**
- Replace the redundant `buildToolCatalog()` in `apps/agent/src/agent/system-prompt.ts` with a high-signal `buildToolRoutingMatrix()`.
- Explicitly instruct the model on temporal routing: route multi-period queries (runway, multi-month net worth trajectory, savings milestones) to `horizon_projection` without manual arithmetic.
- Update `apps/agent/src/agent/tools/financial.ts` so the `horizon_projection` description clearly specifies its intended scope and negative constraints.
- Standardize output synthesis for horizon projections into structured Markdown tables.
- Update Vitest unit tests in `apps/agent/src/agent/__tests__/system-prompt.test.ts` and evaluation assertions in `apps/agent/eval/promptfoo-tests.yaml`.

**Non-Goals:**
- Modifying frontend Svelte components or Reedrich edge API routes.
- Changing the return DTO structure of `horizon_projection` (already compact and <3KB).
- Modifying authentication or session state management.

## Decisions

### 1. Intent-to-Tool Decision Matrix (Temporal Horizon Partitioning)

Replace `buildToolCatalog` with `buildToolRoutingMatrix()` structured along temporal and functional axes:

```
                      [User Inquiry]
                            |
         +------------------+------------------+
         v                                     v
   [Current / Historical]                 [Future Planning]
         |                                     |
   +-----+-----+                         +-----+-----+
   v           v                         v           v
[T = 0]     [T < 0]                   [T + 1 Month] [T = 2 to 24 Months]
Position:   Audit/History:            Micro-Plan:   Macro Forecast:
get_snapshot list_transactions        get_snapshot  horizon_projection(months: N)
financial_summary                      + list_txs   - Multi-month trajectory
                                      (planned)     - Savings milestone timing
                                                    - Runway simulation
```

- **T = 0 (Current State)**: `get_snapshot` (balances & asset allocation), `financial_summary` (safe-to-spend runway & active debt deductions).
- **T < 0 (Historical Audits)**: `list_transactions` (filtering by date, description query `q`, type, category, or wallet).
- **T = 1 Month (Near-Term Micro-Plan)**: `get_snapshot` + `list_transactions(status: 'planned')` for inspecting specific itemized commitments next month.
- **T > 1 to 24 Months (Macro Horizon Forecasting)**: Mandatory `horizon_projection(months: N)`. The LLM is strictly prohibited from executing manual compounding or chained balance arithmetic in text.

### 2. Discriminative Tool Description in `financial.ts`

Update the `horizon_projection` description to establish explicit boundaries against single-period queries:
```typescript
description: 'Ambil proyeksi papan horizon masa depan multi-bulan (roll-forward cashflow deterministik, akumulasi saldo dompet, dan capaian target tabungan). Gunakan tool ini untuk pertanyaan tren 2-24 bulan ke depan, simulasi runway tabungan, atau perkiraan waktu capaian milestone target. JANGAN gunakan untuk mencari transaksi tunggal atau mutasi spesifik.'
```

### 3. Horizon Output Synthesis Protocol

In `buildCommunicationStyle()`, add an explicit standard for presenting horizon projections:
```markdown
| Bulan | Pemasukan Terencana | Pengeluaran Terencana | Kas Bersih (Spendable) | Proyeksi Kas Bebas | Status Milestone |
|---|---|---|---|---|---|
| 2026-11 | Rp 15.000.000 | Rp 8.000.000 | +Rp 7.000.000 | Rp 32.000.000 | — |
| 2026-12 | Rp 18.000.000 | Rp 9.000.000 | +Rp 9.000.000 | Rp 41.000.000 | Target Laptop (Rp 20 Jt) Tercapai! |
```

### 4. Updating Behavior Protocol & Accounting Principles

- Remove the manual arithmetic instructions in `buildBehaviorProtocol` step 3. Replace with a dual guideline: single-month micro-planning vs multi-month horizon forecasting.
- Update `buildAccountingPrinciples`: remove prompt-level instruction to manually calculate multi-month totals. State that forward multi-month cashflow and net worth roll-forward are derived deterministically by the horizon engine.

## Risks / Trade-offs

- **Risk: Breaking existing unit tests**: Existing tests in `apps/agent/src/agent/__tests__/system-prompt.test.ts` may check for strings like `'KATALOG LENGKAP TOOLS'` or `'financial_summary'`.
  - *Mitigation*: Update unit tests to assert the new section headers (`'HEURISTIK PEMILIHAN TOOL FINANSIAL'`, `'horizon_projection'`, `'DATA-FIRST RETRIEVAL'`).
- **Risk: Model calling horizon_projection with invalid months**: Reedrich restricts `months` to integer between 1 and 24.
  - *Mitigation*: The Zod schema in `financial.ts` already enforces `.min(1).max(24).default(6)`, and the routing prompt instructs setting `months` to the relevant horizon or default 6.
