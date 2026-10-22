## 1. Configuration & Worker Handler

- [x] 1.1 Update cron trigger in `apps/agent/wrangler.toml` to `crons = ["0 23 */2 * *"]` to execute every 2 days at 06:00 WIB (23:00 UTC).
- [x] 1.2 Update the `scheduled` event handler in `apps/agent/src/index.ts` to pass `{ batchSize: 7 }` into `drainEvalQueue`.

## 2. Testing & Subrequest Verification

- [x] 2.1 Add unit test in `apps/agent/src/__tests__/unit/eval-drain.test.ts` verifying that `drainEvalQueue` with `batchSize: 7` leases up to 7 jobs and caps external subrequests to $\le 42$.
- [x] 2.2 Add unit test in `apps/agent/src/__tests__/unit/eval-drain.test.ts` verifying that an empty queue returns `{ processed: 0, failed: 0, stagedCandidates: 0 }` with zero external fetch invocations (`mockFetch.mock.calls.length === 0`).

## 3. Validation & Quality Gates

- [x] 3.1 Run agent unit tests with `bun run test:agent` to ensure all tests pass.
- [x] 3.2 Run pre-commit secret scan with `bun scripts/check-secrets.ts` to ensure credential hygiene.
