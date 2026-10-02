# Design

## Context

See `proposal.md` for motivation and scope. This is planning, not evidence of a successful live test or completed credential cleanup.

### Observed current state

| Area | Read-only evidence | Consequence |
| --- | --- | --- |
| Runners | `apps/web/package.json`, `vite.config.ts`, `playwright.config.ts`: Vitest with Svelte runes support and Playwright with local preview on port 4173 | Reuse both dependencies; no new test framework |
| Existing suites | 27 web Vitest files and 30 Playwright files found by the audit; the six inspected CRUD specs contain 18 cases | File names are not proof of persistent CRUD coverage |
| CRUD browser checks | Wallet/category/budget/goal/recurring specs open drawers and validate fields; transaction specs cover interactions, client validation, edit mode, and the delete dialog | They do not complete the create/update/delete persistence chain; inspected suites have no account teardown |
| Numeric tests | Existing currency, dates, lifecycle, category metrics, budget filters, horizon, and net-worth utility tests | Keep meaningful deterministic math/state coverage; the earlier blanket statement that no numeric tests exist was incorrect |
| Browser weakness | Conditional `if (isVisible())` checks and assertions tied to a named September budget or a calendar comment exist | Missing controls can pass silently; replace touched incidental checks with fixture-driven behavior |
| Credentials | Known-format Git blob scan found five credential-looking values across Reedrich, Google, and Groq; values were not validated | Include agent evaluation scripts and OpenSpec history, not just browser tests; a full scanner still must inspect other formats and commit/tag text |
| Git | At inspection: 99 reachable commits; local `master` and `refactor/svelte-conversion`; `origin/master`; `git-filter-repo` unavailable | Preserve both branches and unpublished work; install the approved history tool only during apply |
| Retired API client | LSP references for `contributeToGoal` reach its definition and one mocked unit-test call; the payload is used by that method/import only | Remove method/type/test and obsolete spec promises; do not remove supported goal editing or `apply` |
| Backend contract | Live public OpenAPI reports 1.17.0; no contribution path or `deprecated: true` operation is declared | Contract absence plus the user's deprecation report justifies removal; absence alone is not proof a legacy server route returns 404 |
| Source evidence | Public Reedrich source tree `fdeb0a50be6fb0ba1375c3686c0486eeb0bc03e7` and bounded service/math reads | Supplies accounting and pacing definitions; not proof that the deployed service is identical |
| Graph | Target project is not indexed; coverage tool reports unavailable coverage | Source reads and available TypeScript LSP were used; no exhaustive graph/dead-code claim |

### Contract facts that change the earlier draft

1. Creating an active recurring template materializes planned transaction rows. The backend supports `startDate`, optional `nextRunDate`, and `endDate`; explicit `endDate` bounds the fixture rather than relying on the default materialization cap of 100 occurrences. `apply` selects an existing occurrence, preferably by `transactionId`, and realizes it in place.
2. `/account-detail` partitions **live** wallets/net worth and derives live goal amounts. Date bounds select realized cashflow and overlapping budgets; they do not reconstruct historical wallet capital in the inspected backend source. `/wallets` snapshots and `/analytics/horizon` provide period capital.
3. `filter=planned` has a zero-capital baseline plus earlier planned movement. `filter=realized` reconstructs realized capital. `filter=all` adds prior planned movement to the reconstructed realized baseline. These are not interchangeable totals.
4. Transfer principal changes source/destination wallets but not consolidated wealth. Transfer fees are economic expense. Income credits `amount - fee`; expense debits `amount + fee`.
5. Category-linked budget status uses realized expense within the budget's own period and category. An unlinked-category budget uses explicit `budgetId`. Snapshot budget selection and per-budget spending are separate operations.
6. API goal pacing is based on elapsed days and average-month length 30.4375 days. Goals Horizon computes a calendar-month amount from each projected period end. Equal labels do not justify asserting equal formulas without the same reference date and temporal meaning.

The existing `financial-store` temporal requirement promised historical balances from `/account-detail`, which conflicts with the current backend overview contract. The `financial-store` delta makes the live-overview versus point-in-time wallet distinction explicit and preserves calendar-boundary expectations. This is a contract clarification, not permission to rewrite Reedrich or weaken an observed boundary failure.

## Goals / Non-Goals

**Goals:**
- Make exact financial expectations inspectable before a live run; distinguish accepted inputs, API raw precision, UI rounding, and temporal basis.
- One fixture owner, one explicit lifecycle, with reusable inputs and cleanup rather than runner handoff or global personal authentication.
- Complete UI CRUD and all named financial assertion surfaces while retaining data until late Delete.
- Sanitize credentials/history without losing source changes or reintroducing old history.

**Non-Goals:**
- No accounting-engine reimplementation, generic test DSL, distributed lock service, or new browser framework.
- No new user-facing fields, horizon goal rows on Ledger, redesign, or silently removing supported legacy month syntax.
- Do not broaden dead-code removal to unused candidates without current references. Do not silently patch unrelated financial defects revealed by the new tests.
- No remote rewrite, production request, key validity probe, package installation, or TestBot mutation in this planning workflow.

## Decisions

### 1. Contain credentials before history surgery

Use private local environment files and CI/provider secret stores. Public variables carry API URLs only. Delete `DEFAULT_TOKEN` and the `PUBLIC_API_TOKEN` secret fallback, rather than merely moving a real token into a variable compiled into the client. Normal browser authentication remains user-owned; ephemeral test credentials enter browser storage at test runtime, never at build time.

Migration targets include:
- `apps/web/playwright.config.ts`, every hardcoded live key in `apps/web/tests`, and their personal-profile fallback.
- `apps/agent/eval/run.ts` and `run-gemini.ts`, including model-provider keys and financial-key defaults. Each required key fails preflight if absent; no fake model/API fallback.
- `openspec/specs/agent-chat/infra/spec.md` and affected archived proposal/design/task documents. During apply, replace literal examples with variable names; preserve documents, do not delete whole files to hide the leak.
- `.env.example` files, ignored private env configuration, and CI bindings. A private file never contains values copied into the new artifacts.

Revoke/rotate all exposed values through their issuers first. Add a secret-scanner configuration covering the observed formats, including the observed Google key format when a scanner's standard rules do not recognize it. Keep false-positive exemptions narrowly anchored to non-secret placeholders, not entire test/spec directories.

Disable raw network tracing, HAR, and auth storage uploads for the live project; redact errors and failure payloads. Screenshots may contain finance data but must not display credentials. A debug trace is not uploaded unless its secret-bearing sections have actually been removed.

**Alternative rejected:** environment variables prefixed `PUBLIC_`, a checked-in test key, or a committed replacement-map file. They relocate exposure rather than contain it.

### 2. Preserve commit content with a coordinated graph cutover

The chosen tool is `git-filter-repo`, preserving legitimate history rather than creating one new root commit. Install version 2.47+ with approval, then use its sensitive-data-removal mode in an isolated maintenance copy. Replacement material is a private, permission-restricted file under an ignored session directory; do not embed values in shell history, command arguments, or tracked scripts. Replace secret text in blobs and commit/tag messages as applicable.

The rewrite input must contain the approved local/remote branch and tag work, including the non-default local branch. Freeze local/Colab/CI writes first and reconcile unpublished changes before rewriting. Record old/new commit mapping and verify source preservation, allowing only intended credential substitutions and approved code changes.

Local sanitation, remote publication, hosting caches/PR refs, and clone adoption are four different completion states. Existing remote history cannot be expunged by an ordinary descendant commit or normal fast-forward push. The standard GitHub procedure requires non-fast-forward ref publication; this assistant does **not** bypass the repository's no-force-push rule. Publication is an explicitly approved operator maintenance action, not an automatic push task. No history phase is reported remotely complete before the published refs are verified.

Adopt a clean sanitized clone, or approve a destructive reset only after protecting unpublished work. Do not merge the contaminated graph back; do not run a normal old-clone pull/push loop across this cutover. Reflog expiration/object pruning and retirement of old copies require separate approval. A quarantined old copy remains contaminated and cannot be treated as an operational rollback. Revoked keys stay revoked.

**Alternative rejected:** resetting only the current branch, replacing the latest file, or squashing while leaving old refs reachable. These do not satisfy the requested history removal.

### 3. Remove the unsupported contribution path, retain real money movements

During apply, refresh LSP references before changing exported symbols. Remove the method, import, shared payload, and its mocked forwarding test. A shared `export *` naturally stops exporting the deleted type; remove any named export/caller discovered by current references. No compatibility alias or replacement contribution wrapper.

Goal tests create associations with supported wallet links, then fund goals by actual income/transfers into those wallets. They never patch `currentAmount` to mirror a wallet or call contribution. Unlinked manual stored-balance editing remains supported by the API and is not classified as deprecated.

Retain `applyRecurringTemplate` and the legacy comma-separated month query syntax: the current contract supports both. Correct the old spec claim that `apply` creates a new transaction; occurrence realization is a status transition, not forecast generation.

### 4. One Playwright owner for API integration and UI E2E

Use the existing `APIRequestContext` for authenticated reads/setup/cleanup and the actual preview UI for user mutations and displays. Keep Vitest offline for uncertain deterministic boundaries; do not put live account mutation in Vitest.

Proposed permanent files:

| File | Responsibility |
| --- | --- |
| `apps/web/playwright.integration.config.ts` | Explicit live-only project, one worker, no parallel fixture ownership/retries, Bun build/preview, credential-safe reporters |
| `apps/web/tests/integration/financial-lifecycle.spec.ts` | One test with ordered `test.step` phases, visible UI mutations, API/DOM assertions, desktop/mobile contexts |
| `apps/web/tests/integration/helpers/live-account.ts` | Private configuration, authorized identity check, API context, paginated inventory and cleanup |
| `apps/web/tests/integration/helpers/finance-fixture.ts` | Immutable seed inputs, UTC period definitions, IDs, independent accepted-mutation journal and expected tables |

Add a `test:integration` script. Keep the existing `test:e2e` smoke suite and new live lifecycle from executing together against a wiping account; exclude the new folder from the legacy config. Legacy authenticated specs also obtain private credentials and enforce target permission instead of relying on the former global personal login. Mocked auth/chat tests remain classified as mocked evidence.

`beforeAll` authorizes and wipes the account. The main test owns every dependent phase. `afterAll` is an authorized, account-wide fallback cleanup, not the implementation of UI Delete coverage. Do not split ordered phases into independent files/tests sharing IDs: test selection, worker isolation, and retries would otherwise corrupt dependencies.

CI uses a protected explicitly dispatched live workflow, private environment bindings, and a fixed test-account concurrency group with `cancel-in-progress: false`. The existing ordinary CI retains typecheck/unit/agent tests without live secrets. One worker prevents internal races; a local run additionally needs an exclusive maintenance reservation and a local process lock. CI concurrency is not a distributed lock for arbitrary local/Colab runs; do not claim otherwise.

**Alternative rejected:** Vitest API setup followed by separate Playwright files. A filesystem handoff, independent retries, or `afterAll` in the wrong runner can erase data before UI validation.

### 5. Explicit authorization and complete cleanup

Private/runtime configuration:

| Variable | Role |
| --- | --- |
| `REEDRICH_TEST_API_TOKEN` | Private dedicated TestBot credential; never print it |
| `REEDRICH_TEST_API_BASE_URL` | Exact approved financial target; not inferred from a token prefix |
| `REEDRICH_TEST_USER_ID` | Expected test-user identity |
| `REEDRICH_TEST_ALLOW_DESTRUCTIVE` | Explicit opt-in for full financial-account wipe |
| `REEDRICH_TEST_ALLOW_PRODUCTION` | Required only after explicit user approval of a production target/account run |

An environment opt-in is an execution guard, not a substitute for actual user authorization. Validate target/run permission **before** authenticated identity preflight; then require `/api/v1/me` to match the expected user. No missing/invalid-key skip, personal fallback, or destructive teardown when authorization never succeeded.

Use the same dependency-aware cleanup routine before setup and as final fallback:
1. Enumerate all recurring templates, transactions, goals/links, budgets, debts/loans, categories, and wallets. Drain pagination; do not use the UI page or default limit as inventory.
2. Stop/delete templates before the transaction sweep, so generated rows cannot be recreated while cleanup runs. Do not assume deletion cascades to planned occurrences; enumerate again afterward.
3. Delete all transactions; realized rows reverse balances while planned rows do not. During final UI Delete, verify these different effects before account wiping.
4. Remove goal links/delete goals, budgets, and debts/loans. Keep the user profile and auth identity.
5. Delete user categories, retaining the backend-protected system Adjustment category if present. Do not use an arbitrary allowlist to retain ordinary default categories.
6. For each now-unlinked/unreferenced wallet, `PATCH { balance: 0 }`, verify zero, handle any newly created adjustment rows if the deployed contract produces them, and delete it.
7. Re-enumerate every mutable collection, verify empty finance data, zero snapshot totals/flows, and only protected system categories. Any residual reference, unread page, or failed delete fails cleanup.

Continue independent cleanup after one entity fails, aggregate redacted errors, and fail the run if cleanup is incomplete. Do not retry arbitrary failed mutations as a generic reliability feature. A hard process kill cannot guarantee `afterAll`; the next authorized pre-clean recovers remaining data. Auth expiry or revoked keys are cleanup failures, not permission to try another account.

### 6. Independent fixture and expected journal

All primary amounts are integer IDR and opening wallet balances are zero. This avoids live FX and artificial opening-balance cashflow. Capture one UTC anchor date for the run; derive M-2, M-1, M0, M+1, M+2, M+3 from it. Set browser timezone to UTC and locale deliberately. Do not freeze only the browser clock while pretending the backend is frozen.

Seed current realized transactions at the captured UTC date's start so none are future-dated; use explicit historical dates. Include a historical expense at M-2's final UTC instant and the next salary at M-1's first instant to expose date-boundary errors. Canonical API period reads use full ISO start/end instants; separately test UI/date-only queries so a normalization defect cannot be masked by the API helper.

Entity inputs:
- W-OP: spendable IDR bank wallet, institution BCA, opening 0.
- W-EMERGENCY: locked IDR wallet, institution BCA, opening 0.
- W-TRIP: locked IDR wallet, institution BRI, opening 0.
- Categories: salary/income, food/expense, transport/expense, with run-unique names.
- B-FOOD: current-month food budget, create at 2,000,000 then UI-update to 2,500,000.
- B-TRANSPORT: current-month transport budget at 1,000,000. Journal the exact accepted date bounds; do not silently change a date-only form input into a different period timestamp.
- G-EMERGENCY: target 10,000,000, linked only to W-EMERGENCY.
- G-TRIP: target 5,000,000, linked only to W-TRIP.
- Goal target dates: a fixed date in M+6, shared with the independent pacing calculation.

Primary realized journal:

| Period | Salary to W-OP | Food expense | Transport expense | Transfer to emergency | Transfer to trip | Realized transaction count |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| M-2 | 10,000,000 | 1,000,000 | 0 | 2,000,000 | 1,000,000 | 4 |
| M-1 | 5,000,000 | 1,000,000 | 500,000 | 1,000,000 | 500,000 | 5 |
| M0 | 5,000,000 | 600,000 + 400,000 | 500,000 | 1,000,000 | 500,000 | 6 |

The first M0 food expense is submitted at 400,000 then edited to 600,000. The journal records an additional 200,000 debit, not a new 600,000 debit. Rename each entity through its UI edit flow and retain its ID/associations; update a goal target before the canonical checkpoint, then use final targets above.

Create five monthly recurring templates with `startDate` in M+1 and `endDate` on the corresponding M+3 occurrence date, interval 1, admin fee 0:
- Salary: income 5,000,000 to W-OP.
- Food: expense 1,000,000 from W-OP.
- Transport: expense 500,000 from W-OP.
- Emergency saving: transfer 1,000,000 from W-OP to W-EMERGENCY.
- Trip saving: transfer 500,000 from W-OP to W-TRIP.

Use the actual recurring form's start/end date fields. Verify exactly three occurrences per template in the bounded schedule, each with template ID, occurrence date, transaction ID, status, source/target, and amount. A recurring UI edit before the checkpoint must propagate the intended future values without duplicate occurrences. No `apply` call during setup or forecast validation.

Expected combined closing capital and goal progress:

| Period | W-OP | W-EMERGENCY | W-TRIP | Total | Locked | Emergency % | Trip % |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| M-2 | 6,000,000 | 2,000,000 | 1,000,000 | 9,000,000 | 3,000,000 | 20 | 20 |
| M-1 | 8,000,000 | 3,000,000 | 1,500,000 | 12,500,000 | 4,500,000 | 30 | 30 |
| M0 | 10,000,000 | 4,000,000 | 2,000,000 | 16,000,000 | 6,000,000 | 40 | 40 |
| M+1 | 12,000,000 | 5,000,000 | 2,500,000 | 19,500,000 | 7,500,000 | 50 | 50 |
| M+2 | 14,000,000 | 6,000,000 | 3,000,000 | 23,000,000 | 9,000,000 | 60 | 60 |
| M+3 | 16,000,000 | 7,000,000 | 3,500,000 | 26,500,000 | 10,500,000 | 70 | 70 |

The historical percentages describe wallet-derived wealth at those closes; they are not an assertion that the live goal-list endpoint is historical. Historical requirements apply to wallet/transaction surfaces; projected goal assertions use the goal horizon.

Per-period primary movement:
- M-2 W-OP: opening 0, in 10,000,000, out 4,000,000, delta 6,000,000.
- Each subsequent period W-OP: in 5,000,000, out 3,000,000, delta 2,000,000.
- Each subsequent emergency/trip wallet: delta +1,000,000/+500,000, no outflow.
- Economic income/expense/net: M-2 = 10,000,000/1,000,000/9,000,000; every later canonical month = 5,000,000/1,500,000/3,500,000.
- B-FOOD spent/remaining/used = 1,000,000/1,500,000/40%; B-TRANSPORT = 500,000/500,000/50%.
- Current allocation headroom: remaining budgets 2,000,000, unallocated spendable 8,000,000, no deficit.
- In all-wallet/all-institution current view: BCA subtotal 14,000,000; BRI 2,000,000. Filtered tabs use only their included wallets.
- Planned-only future closing vectors: M+1 = 2,000,000/1,000,000/500,000; M+2 = 4,000,000/2,000,000/1,000,000; M+3 = 6,000,000/3,000,000/1,500,000. Totals 3,500,000/7,000,000/10,500,000; goal percentages 10/20/30, not 50/60/70.
- Realized-only future capital stays 10,000,000/4,000,000/2,000,000; future flow is zero.

This arithmetic was independently exercised during planning; it does not constitute a Reedrich smoke run.

### 7. Numeric definitions and rounding

Do not import production finance helpers into expected-value generation.

| Metric | Independent contract |
| --- | --- |
| Realized source/target movement | Income `amount - fee`; expense `-(amount + fee)`; transfer source `-(amount + fee)` and target `+amount` |
| Economic cashflow | Income credits minus income fees; expenses include expense/transfer fees; transfer principal excluded |
| Closing wallet capital | Opening plus in minus out, with the explicit status-mode baseline |
| Wealth partition | Sum all closing wallets; split by lock state; primary debt/receivable totals zero |
| Budget spending | Eligible realized expense plus expense fees, within its own accepted period, matched by category or explicit budget ID according to budget type |
| Budget remaining/utilization | `amount - spent`; raw `100 * spent / amount` to two decimal places; card text rounds to integer; bar clamps visually |
| Budget daily allowance | Positive remaining divided by positive `ceil((periodEnd - now) / day)`, to two decimals; otherwise zero |
| Goal current/remaining | Converted sum of linked wallets; `max(0, target - current)` |
| API goal pacing | `days = max(1, ceil((targetDate - referenceNow)/day))`; `months = max(0.1, round(days / 30.4375, 2))`; daily/monthly savings are remaining divided by days/months, rounded to two decimals; null for completed/cancelled/no deadline |
| Goal percentages | Goal pacing API caps at 100 and keeps two decimals; horizon API returns raw two-decimal progress; card/horizon text uses its integer display convention; never infer raw percentage from a bar width |
| Goals Horizon monthly amount | Remaining at projected close divided by `max(1, calendar-month difference(targetDate, periodEnd))`; it is not the API's average-month pacing |
| Monthly goal improvement | Current month-end progress minus prior close, in percentage points |
| FX | Primary live fixture is all IDR. Preserve offline currency tests with fixed rates; any live cross-currency check uses a captured authoritative rate/reference and explicit currency precision, never a fixed guessed live FX rate |

Compare backend date-derived pacing within a single captured UTC reference day; avoid a run spanning a date/month rollover. Browser lifecycle days are calendar-day counts; do not apply that formula to the backend's overdue one-day pacing clamp. Null deadlines, overdue state, completed state, raw percentage, and progress fill each have separate assertions.

### 8. Assertion surface matrix grounded in current components

The UI remains Svelte 5: `reedrichStore` normalizes API DTOs with runes; date/filter/settings stores own view state. Layout-mounted drawers remain shared. Tests operate these existing controls instead of building test-only UI or a second state store.

| Surface and hierarchy | Values to assert | Source/temporal basis |
| --- | --- | --- |
| `/` -> `CockpitKpiStrip` | Net worth, spendable, locked, net cashflow | `account-detail.netWorth.consolidated.total`, wallet partition totals, `monthlyCashFlow.netSavings`; live capital plus selected-period flow |
| `/` -> cashflow/category view | Income, expense, net, category amount/share | `monthlyCashFlow` and expense breakdown; selected realized period |
| `/` -> `CockpitBankWidget` | Wallet amount, totals per institution and spendable/locked tab | Parameterized wallet collection; assert its selected-period snapshot basis, not a live-total assumption |
| `/` -> `CockpitAllocationWidget` | Budget limits/spent/remaining/percent, remaining commitment, free headroom, goal current/target/progress | Temporally selected snapshot budgets, spendable funds, and live snapshot goals |
| `/` -> `CockpitRecentLedger` | Exact dates, IDs, amounts, descriptions, wallet links, ordering | Realized, date-bounded transaction envelope; current limit 30 is a feed limit, not total-history evidence |
| `/ledger` list + detail drawer | Exact rows, gross/native amount, fees, date/time, status/type, associations, count, inflow/outflow/net, net-assets tile | Structured transaction envelope plus the existing timeline-capital calculation; check full dataset vs page scope |
| `/ledger` -> `HorizonBoard` -> `PeriodSummaryCard` and period columns | Inflow/outflow/net, closing net/spendable/locked assets, planned/realized rows per period | Server horizon `cashflow`, `netWorth`, wallet/transaction periods; no visible goal rows or goal-pacing section |
| `/accounts` list/groups + wallet drawer | Opening/in/out/delta/closing basis controls, wallet amounts, total/spendable/locked and institution totals | `wallets[].snapshot.{initialBalance,totalIn,totalOut,periodDelta,totalBalance}` with explicit status/date bounds |
| `/accounts` -> `AccountsHorizonBoard` | Every wallet's selected basis amount for every period, movement cells, period total | Per-period wallet queries and status/balance-basis settings; values cannot be repeated current balance |
| `/planning` goals -> `GoalCard`/`GoalDrawerContent` | Target/current/remaining/progress, linked breakdown, deadline/day state, API daily/monthly pacing | Normalized goal list/detail and live linked-wallet balances |
| `/planning` goals -> `GoalsHorizonBoard` | Each goal's projected current amount, percent and month-to-month delta; calendar pacing; milestone | Horizon period goal projections, indexed by goal ID; deadline and projected period end |
| `/planning` budgets -> `BudgetCard`/budget detail | Limit/spent/remaining/used percent, period, lifecycle and pacing | Budget list/detail and date-scoped snapshot; do not assume a metadata-only list contains spending metrics |
| `/planning` obligations | Template name/type/wallet, amount/fee, schedule, active state, next occurrence; due realization action | Recurring-template collection and materialized transactions |
| `/planning#categories` -> `CategoryStudio` | Income/expense category totals, count, average, min/max, shares, bank/category/budget associations | Exhaustively paged realized transaction query over the selected dates |

DTO mapping assertions verify observable numbers, not just copied property names. Wallet live fields (`walletBalance`) and snapshot `totalBalance` are separate. Goal list native fields (`goalTargetAmount`, `goalCurrentAmount`, `linkedWallets`) normalize to detail/snapshot fields (`targetAmount`, `currentAmount`, `linkedWalletsBreakdown`). Budget detail returns `{ budget, spent, remaining, percentUsed, ... }`; list metadata must not become false zero-valued spending proof.

Use roles, field labels, unique fixture names, and minimal stable `data-entity-id`/`data-period-key`/metric test IDs where current semantics are insufficient. Read actual rendered text; do not assert a test-only numeric data attribute. No CSS-class, incidental wording, or source-text assertions.

Desktop (>=1024px): exercise side drawers, grouped wallet list, summaries, horizontal horizon columns, and all visible numeric cells. Mobile (<1024px): create a second browser context during the same ownership window, use mobile navigation/date controls/full-width drawer, swipe/scroll all three future periods, and verify the same amounts. Do not wipe/reseed for a parallel mobile project or silently skip hidden desktop controls.

### 9. Ordered case plan

| Phase | Cases and execution | Expected evidence |
| --- | --- | --- |
| A — authorize/wipe | Missing config, wrong target, wrong identity negative checks offline; approved identity, stale entity inventory, dependency-safe pre-clean | No unauthorized request/mutation; approved account has no residual mutable financial data |
| B — entities | Wallet/category/budget/goal/recurring actual UI create/read/update; goal links and stable IDs | Persisted accepted input fields; no opening-balance cashflow; planned rows exist without `apply` |
| C — transactions | UI income, expense, transfer; edit food 400k to 600k; historical API seeds at explicit instants | Per-mutation wallet/budget/goal delta, exact associations, six final M0 rows |
| D — current values | API raw checks, then Cockpit/Ledger/Accounts/Planning/Category Studio rendered checks; navigate back after standalone loads | Canonical M0 values, no stale cache or metadata-only spending substituted as zero |
| E — history | M-2 and M-1 ledger and wallet views, all balance bases, date presets/custom bounds, reload/back navigation, end/start boundary cases | Nonzero historical table; next-period rows excluded; live-overview fields explicitly stay live |
| F — forecast | Explicit three future intervals with `filter=all`, then planned/realized modes; two-interval result comparison; Ledger, Accounts, Goals boards | 15 bounded planned rows; every wallet/month cell and goal 50/60/70%; +10 percentage points/month; zero live mutation |
| G — boundaries | Additional transitions after the canonical checkpoint; independent journal updated for each; desktop/mobile read checks | Monetary/state invariants below; primary data not deleted early |
| H — late UI Delete | Delete transactions, then templates and any resulting planned remnants, goal links/goals, budgets/categories, zeroed wallets | Per-realized delete reversal; planned delete has no live balance effect; persisted absence for every CRUD entity |
| I — `afterAll` | Re-enumerate and remove all remaining mutable data with the same authorized cleanup owner | Account empty even after failure/partial setup; cleanup failure makes the run fail |

Phase G mandatory boundary groups:
- First, a planned W-OP expense of 20,000,000 in M+3: projected W-OP becomes -4,000,000 and total 6,500,000 while live capital and unaffected goal balances stay unchanged. Keep this row for its assertions and delete it only in the final phase; later edge expectations use the updated journal.
- Expense fee, income fee, transfer fee (100,000 principal/5,000 fee), excluding transferred principal from economic totals.
- Transaction type switch with reverse-old/apply-new effects; source/target wallet change; moving an expense across month/budget boundaries; unaffected wallets and goals.
- Planned transaction creation leaves live balances unchanged; realize an existing **due** occurrence with actual amount override, preserve occurrence/ID/planned amount/realized timestamp; second realization fails without another debit. Use a separate due template created after forecast proof, never realize future fixture rows to make the forecast appear.
- Recurring future edit/deactivation/cancellation changes planned occurrences without rewriting realized history or leaving duplicates; month-end frequency edge checked offline with fixed dates plus one bounded live schedule.
- Category-linked and unlinked-category budgets; 80% warning, 100% full, >100% exceeded; raw negative remaining vs clamped headroom; historical/upcoming budget selection.
- Additional wallet link/unlink, uncoupled manual stored-balance goal (supported API behavior, not contribution), over-target milestone, completed/cancelled/overdue/no-deadline goal, frozen untouched goal results.
- Pagination uses small limits and a unique ordered ID set; at least one >50-row bounded dataset ensures a default first-page limit cannot corrupt category metrics or timeline reconstruction. This dataset is created only after primary values were proved and is retained through its assertions.
- Meaningful empty/failed API and FX/precision boundaries remain deterministic offline tests, not financial response mocks in the live project.

A missing feature/control or numerical mismatch is a failed check, not permission to weaken an expectation. The new live job is a strict diagnostic oracle; it does not guarantee that today's application already satisfies every case. A proven product defect is reported with reproduction evidence and requires explicit scope approval before implementation expands into a feature/calculation repair.

## Risks / Trade-offs

| Risk | Mitigation |
| --- | --- |
| Production/TestBot wipe affects the wrong principal | Approved exact target before network, private token, `/me` identity match, explicit destructive opt-in, no personal fallback |
| Rotation unavailable or tool not installed | Named execution prerequisites; obtain issuer/admin authorization and installation approval before apply actions; no pretend cleanup |
| Published history and clones retain credentials | Separate completion states, approved operator cutover, remote/ref scan, clone adoption, hosting support/caches; rotate keys regardless |
| History rewrite loses unpublished/Colab work | Freeze writers, inventory both local branches/remote refs, protect work, map rewritten commits, source-preservation review; no unapproved hard reset |
| Default recurring materialization creates excessive rows | Explicit start/end schedule for three occurrences; verify bounded IDs/dates and pagination; delete templates before full sweep |
| UTC rollover, local-time parsing, date-only end bounds | One captured UTC day, UTC browser, exact API timestamps plus dedicated date-only UI boundary checks; do not conceal a normalization defect |
| Live capital confused with selected-period capital | Explicit source/temporal matrix; do not assert historical zeros or projected live balances on a planned-delta view |
| API pacing and UI month pacing differ | Two independently calculated definitions; report the distinction rather than arbitrarily equating fields |
| Metadata-only budget list omits `spent` | [INFERENCE] inspected list service returns metadata, while FE normalization defaults missing spending to zero; strict Planning-vs-detail/snapshot tests must expose any live inconsistency, not bless zero |
| Fees ignored by a client aggregation or timeline sees one page | [INFERENCE] current Ledger/category aggregations and transaction-cache scopes need live verification; fee and >50-row tests require independent full-period totals |
| Backend source and deployed contract differ | Record runtime contract version and accepted inputs during the authorized run; differences fail/report, not an unapproved backend mutation |
| Shared test account or process termination | Single ownership lane, CI concurrency, explicit local reservation/lock, no automatic retries/cancellation, robust pre-clean plus authorized `afterAll`; hard-kill recovery is next-run pre-clean |
| Secrets in traces/storage/evaluation errors | In-memory browser auth, no raw network traces/serialized storage uploads, redacted diagnostics and secret scan before artifact upload |

## Migration Plan

1. Apply only after a new implementation request. Confirm issuer rotation, tool-installation approval, and the coordinated history maintenance scope. Do not interpret this proposal as permission for remote writes or production access.
2. Remove source/default credentials and literal examples, update private configuration, and add scanner coverage. Preserve current user changes. Verify redacted source/build scans and missing-config fail-fast behavior without a production call.
3. Sanitize the approved history copy with `git-filter-repo`, preserve branch work, verify reachable objects/messages and source changes, and record mapping. Approved operator publishes sanitized refs; verify them before resetting/replacing consumer clones. Do not republish old credential-bearing history as rollback.
4. Refresh symbol references, delete retired contribution method/type/test, and reconcile delta specs during normal OpenSpec archive. Preserve supported recurring apply, manual unlinked balances, and goal wallet associations.
5. Add the single-owner Playwright lifecycle, independent fixture/oracle, minimal locators, and gated live workflow. Keep normal unit/agent CI independent of live secrets. Update existing environment examples, package scripts, and project testing documentation.
6. After explicit target/account permission, run the actual full lifecycle against the approved dedicated account, observe API persistence and desktop/mobile surfaces, and verify final cleanup. Report every exercised scenario and mismatch with redacted evidence; do not claim success from test-file counts or unit tests alone.

Rollback: ordinary source changes can be reverted without restoring revoked keys. Financial fixtures are disposable and cleaned, not backed up as production data. History cutover is not rolled back by restoring contaminated refs; recover legitimate work through sanitized patches/commits under the maintenance owner.

## References

- [Reedrich llms.txt](https://reedrich-mcp.lutfidmz.workers.dev/llms.txt) and [OpenAPI](https://reedrich-mcp.lutfidmz.workers.dev/openapi.json).
- [Reedrich goal pacing](https://github.com/lutfi-zain/reedrich-mcp/blob/main/src/utils/goals.ts), [budget metrics](https://github.com/lutfi-zain/reedrich-mcp/blob/main/src/utils/budgets.ts), [wallet reconstruction](https://github.com/lutfi-zain/reedrich-mcp/blob/main/src/utils/ledger.ts).
- [Reedrich snapshot service](https://github.com/lutfi-zain/reedrich-mcp/blob/main/src/services/account-snapshot.ts), [horizon service](https://github.com/lutfi-zain/reedrich-mcp/blob/main/src/services/horizon.ts), [recurring lifecycle](https://github.com/lutfi-zain/reedrich-mcp/blob/main/src/services/recurring.ts).
- [GitHub sensitive-data removal guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).
