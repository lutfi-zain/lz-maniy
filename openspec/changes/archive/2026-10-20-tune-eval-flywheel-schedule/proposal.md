## Why

The current evaluation queue drainer runs every 5 minutes (`*/5 * * * *`), which creates excessive invocation noise for low-to-moderate conversation volume. Tuning the schedule to run once every 2 days at 06:00 WIB (23:00 UTC) establishes a predictable, low-noise off-peak evaluation window. 

To prevent queue starvation and backlog accumulation across the 48-hour accumulation window without breaching Cloudflare Worker's 50-subrequest quota limit, the leased batch size per scheduled execution is tuned from 5 to 7 jobs ($7 \times 6 = 42$ max subrequests), while preserving zero-cost immediate return when the queue is empty.

## What Changes

- **Update Cron Trigger**: Change `crons` in `apps/agent/wrangler.toml` from `["*/5 * * * *"]` to `["0 23 */2 * *"]` (06:00 WIB / 23:00 UTC every 2 days).
- **Tune Scheduled Batch Lease**: Increase the scheduled worker batch size in `apps/agent/src/index.ts` from `batchSize: 5` to `batchSize: 7` to handle 48-hour job accumulation safely within the Cloudflare 50-subrequest ceiling.
- **Zero-Cost Verification**: Re-assert that when `eval_queue` has zero pending items, the scheduled execution exits immediately after a single D1 read query without consuming AI gateway tokens or telemetry subrequests.
- **Test Suite Updates**: Update test fixtures and unit tests in `eval-drain.test.ts` to assert against the updated default scheduled batch size and subrequest boundaries.

## Capabilities

### New Capabilities
*(None)*

### Modified Capabilities
- `eval-flywheel`: Updates the scheduled worker evaluation queue draining requirement and scenarios to reflect the 2-day cron cadence (06:00 WIB / 23:00 UTC) and the tuned 7-job batch size for subrequest budget enforcement.

## Impact

- `apps/agent/wrangler.toml`: Cron trigger definition changed.
- `apps/agent/src/index.ts`: Scheduled event handler options adjusted.
- `apps/agent/src/__tests__/unit/eval-drain.test.ts`: Unit test assertions updated.
- No breaking changes to HTTP endpoints or D1 database schemas.
