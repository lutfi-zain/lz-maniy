# Technical Design: LLMOps System Prompt Synchronization Across Promptfoo, Arize Phoenix, and Langfuse

## Context

See `proposal.md` for background and motivation.

The production AI financial agent prompt in `apps/agent/src/agent/system-prompt.ts` now incorporates the high-signal Context Engineering architecture (Intent-to-Tool Decision Matrix, temporal dispatch $T=0/T<0/T+1/T>1\dots 24$, mandatory `horizon_projection`, and Markdown table formatting). However, the evaluation framework files in `apps/agent/eval/prompts/` still contain older prompt text lacking these decision heuristics.

Consequently:
- `bunx promptfoo eval` benchmarks models against legacy instructions.
- `apps/agent/eval/phoenix-suite.ts` pushes outdated prompts to Arize Phoenix.
- `apps/agent/eval/observability-sync.ts` pushes outdated prompts to Langfuse Cloud.

## Goals / Non-Goals

**Goals:**
- Update `apps/agent/eval/prompts/system-baseline.txt` to reflect the 1:1 canonical production prompt from `system-prompt.ts`.
- Update `apps/agent/eval/prompts/system-compact.txt` with a condensed, token-optimized version of the Intent-to-Tool Decision Matrix.
- Update `apps/agent/eval/prompts/system-fewshot.txt` by adding a few-shot example for multi-month horizon projections and milestone tracking.
- Update `apps/agent/eval/phoenix-suite.ts` to tag prompt versions as `v1.15.0` and `production` with the updated canonical content.
- Update `apps/agent/eval/observability-sync.ts` to sync the updated prompts to Langfuse Cloud under labels `production`, `baseline`, and `staging`.
- Execute `bun run test:agent` and verify 100% test pass rate across all suites.
- Execute `bun run --cwd apps/agent observability:sync` to prove live synchronization with Phoenix and Langfuse.

**Non-Goals:**
- Modifying frontend Svelte 5 application code or routing.
- Changing Cloudflare D1 database migrations or Reedrich edge API endpoints.

## Decisions

### 1. Canonical Prompt Architecture (`system-baseline.txt`)

`system-baseline.txt` will serve as the full textual representation of the production system prompt:
1. Role & Identity: Executive financial assistant & analyst Eve.
2. Dynamic System Clock & Calendar: WIB timezone anchor.
3. Intent-to-Tool Decision Matrix:
   - $T = 0$ (Real-time Current): `get_snapshot`, `financial_summary`.
   - $T < 0$ (Historical Audit): `list_transactions`.
   - $T = 1$ Month (Micro-Plan): `get_snapshot` + `list_transactions` (planned).
   - $T > 1 \text{ to } 24$ Months (Macro Horizon): Mandatory `horizon_projection(months: N)`.
   - Entity & UI tools grouped cleanly.
4. Curiosity Protocol & Confirmation Gates.
5. Accounting Invariants (Transfer Delta = 0, Multi-Currency FX).
6. Output Formatting (Rupiah `Rp 1.234.567`, No `$`, Markdown trajectory table for horizon).

### 2. Token-Optimized Variant (`system-compact.txt`)

`system-compact.txt` condenses instructions to <500 tokens while preserving hard negative constraints and the temporal decision matrix ($T=0, T<0, T>0$).

### 3. Golden Few-Shot Scenario (`system-fewshot.txt`)

Add **Contoh 5 (Proyeksi Papan Horizon & Capaian Target)**:
```text
User: "bisa beli laptop gak di bulan desember? cek sisa per bulan sampai april"
Aksi Eve: Panggil horizon_projection(months: 6, filter: 'all')
Respon: Tabel Markdown lintasan bulanan (Pemasukan, Pengeluaran, Kas Bersih, Proyeksi Kas Bebas, Status Milestone).
```

### 4. Dual Observability Sync (`observability-sync.ts` & `phoenix-suite.ts`)

- Execute `syncObservabilitySuite()`:
  - Arize Phoenix: updates `maniy-agent-system` prompt versions with the new baseline and compact text.
  - Langfuse Cloud: posts prompt updates to `/api/public/v2/prompts` with commit audit metadata.

## Risks / Trade-offs

- **Risk: Discrepancy between code generator and prompt files**: If `system-prompt.ts` changes in the future, prompt files could drift again.
  - *Mitigation*: We ensure both `system-baseline.txt` and `system-compact.txt` are tested in unit tests and synchronized in CI via `observability:sync`.
