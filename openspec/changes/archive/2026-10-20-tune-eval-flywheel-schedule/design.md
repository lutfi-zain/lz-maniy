## Context

In `apps/agent`, the evaluation flywheel operates an asynchronous out-of-band evaluation queue in Cloudflare D1 (`eval_queue`). The worker entrypoint `apps/agent/src/index.ts` declares a `scheduled` handler that invokes `drainEvalQueue(env, { batchSize: 5 })`, triggered by `wrangler.toml` crons.

Currently, `wrangler.toml` sets `crons = ["*/5 * * * *"]`. For low-to-moderate conversation volume, running every 5 minutes generates unnecessary worker wakeups. Transitioning to a biennial cadence (once every 2 days at 06:00 WIB) concentrates evaluation into a single off-peak window.

Each evaluation job in `drainEvalQueue` incurs up to 6 external HTTP subrequests:
- 1 fetch to OMP AI Gateway (`google-antigravity/gemini-3.8-flash` LLM-as-a-judge at temperature 0.0)
- 4 fetches to Langfuse (`overall_eval`, `financial_soundness`, `persona_tone`, `tool_trajectory`)
- 1 optional fetch to Telegram Bot API on evaluation failure ($score < 0.5$)

Cloudflare Workers enforce a strict quota of **50 subrequests** per request execution.

## Goals / Non-Goals

**Goals:**
- Update `wrangler.toml` cron schedule to run every 2 days at 06:00 WIB (`0 23 */2 * *` UTC).
- Tune the scheduled batch lease size in `apps/agent/src/index.ts` from 5 to 7 jobs, clearing up to 7 accumulated turns per run while capping maximum subrequests at $42 \le 50$.
- Re-verify zero-cost fast exit when `eval_queue` has no pending items (zero external HTTP calls, zero token consumption).
- Keep unit and integration tests passing.

**Non-Goals:**
- Refactoring the Langfuse telemetry client to batch scores into a single endpoint (unnecessary while volume is within 7 jobs / 48 hours).
- Altering manual HTTP admin drain `/api/eval/drain-queue` batch size or authentication guards.
- Modifying database schemas or tables in D1.

## Decisions

### Decision 1: UTC Cron Syntax for WIB Alignment
Cloudflare Workers cron daemon executes exclusively in UTC.
- 06:00 WIB (UTC+7) = 23:00 UTC of the prior calendar day.
- To execute every 2 days at 23:00 UTC, the cron string is `0 23 */2 * *`.
- *Alternatives considered*: `0 6 */2 * *` would fire at 13:00 WIB (mid-day peak), which contradicts off-peak batch requirements.

### Decision 2: Batch Size Capped at 7 for Subrequest Safety Margin
With 6 maximum subrequests per job:
$$\text{Max Subrequests} = 7 \text{ jobs} \times 6 \text{ subrequests/job} = 42 \text{ subrequests}$$
This leaves an 8-subrequest safety margin (42 out of 50 allowed) to absorb network retries, connection resets, or internal runtime subrequests.
- *Alternatives considered*: Batch size 8 ($8 \times 6 = 48$, only 2 margin, dangerous on retries); Batch size 5 (under-utilizes subrequest capacity and risks backlog starvation).

### Decision 3: Deterministic Zero-Cost Return Pattern
In `drainEvalQueue`:
```ts
const leased = await leasePendingEvalJobs(env.DB, batchSize, options.priority);
if (leased.length === 0) {
    return { processed: 0, failed: 0, stagedCandidates: 0 };
}
```
When no chat activity occurs or all chat turns pass Level 0 checks without sampling, `leasePendingEvalJobs` returns `[]` and `drainEvalQueue` exits immediately after a single D1 read. No external requests are made.

## Risks / Trade-offs

- **Risk: Backlog buildup if anomalous turns exceed 7 in 48 hours**
  - *Mitigation*: Level 0 in-band evaluators and user feedback endpoints still dispatch immediate real-time alerts to Telegram regardless of the queue schedule. Unprocessed jobs remain safely in `status = 'pending'` in D1 and lease during the next scheduled cycle, or can be drained on demand via `POST /api/eval/drain-queue`.
- **Risk: Month-end parity in cron expression `*/2`**
  - *Mitigation*: In standard cron engines, day 31 to day 1 might trigger two consecutive days at month boundaries. For background evaluations, firing slightly earlier on month transitions poses zero functional risk and prevents backlog over long months.
