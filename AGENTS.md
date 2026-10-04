# AGENTS.md

**Repository:** `lz-maniyy-v2`  
**Domain:** Personal Financial Planning & Account Intelligence Dashboard (Executive Cockpit, Ledger Studio, Planning Studio, and AI Financial Agent)

This file is the authoritative guide for AI coding agents working in this repository. It defines the layered architecture, code style rules, testing requirements, ubiquitous language, and hard security constraints that every change must satisfy.

---

## Commands

```bash
# Unit tests with Vitest (Web)
bun run test:web

# Unit tests with Vitest (Agent Cloudflare Worker)
bun run test:agent

# Svelte 5 & TypeScript full-workspace type checking
bun run check:web

# End-to-end integration tests (Playwright)
bun run --cwd apps/web test:e2e

# Pre-commit secret credential scan (MANDATORY before commit/push)
bun scripts/check-secrets.ts

# Deep reachable git history secret scan
bun scripts/check-secrets.ts --history
```

Run all unit tests, type checking, and secret scans to confirm they pass before finalising any change.

---

## Project Context & Business Domain (DDD)

**Ubiquitous Language:**
- **Wallet (Dompet):** User financial account partitioned by institution and function:
  - *Spendable (Operasional):* Unlocked cash available for daily runway and expenses (`isLocked: 0`).
  - *Locked (Cadangan):* Committed reserves protected from safe-to-spend runway (`isLocked: 1`).
- **Net Worth:** Consolidated total liquid wealth converted into base currency (IDR) using live conversion rates or stablecoin pegs.
- **Transaction (Mutasi):** Atomic financial record with direction (`in` / `out`), type (`expense`, `income`, `transfer`), and status:
  - *Realized:* Settled transaction that already occurred.
  - *Planned:* Future committed transaction incorporated into projections.
- **Budget (Pagu Anggaran):** Categorized expenditure ceiling for a specific date window with pacing alerts (`on_track`, `warning`, `over_budget`).
- **Goal (Target Tabungan):** Savings milestone with target amount, deadline, pacing metrics, and optional linked funding wallets.
- **Obligation (Kewajiban):** Debt liabilities (`ActiveDebt`) and loan receivables (`ActiveLoan`) with tracked due dates and remaining amounts.
- **Recurring Template (Tagihan Rutin):** Automated recurring schedule for repeating expenses, income, or intra-wallet transfers.
- **Horizon Board:** Multi-period forward-looking calendar projection of net worth and wallet balances computed at the edge.
- **Point-in-Time Snapshot:** Historical or forward-projected wallet balance (`snapshot.totalBalance`) bounded by temporal `startDate` and `endDate`.
- **Safe-to-Spend (Runway):** Liquid cash available for non-committed daily spending, calculated as spendable cash minus near-term planned allocations.
- **AI Agent Chat:** Conversational financial assistant supporting tool calling, multi-model routing, credit accounting, token compaction, and UI command generation.

Ensure all variable names, database columns, store properties, and API responses strictly adhere to this ubiquitous language.

---

## Architecture Boundaries (Progressive Disclosure)

Logic flows strictly according to the defined architectural patterns across the Bun monorepo (`apps/web`, `apps/agent`, `packages/shared`).

For the canonical implementation patterns, refer to these Gold Standard files:
- **Financial State & Store Pattern:** [`apps/web/src/lib/stores/reedrich.svelte.ts`](file:///home/ubuntu/projects/lz-maniyy-v2/apps/web/src/lib/stores/reedrich.svelte.ts)
  *Svelte 5 runes (`$state`, `$derived`), normalized API caching, concurrency pool gating (max 10), point-in-time snapshot balance priority, and resilient offline mock fallback.*
- **AI Agent Chat Store Pattern:** [`apps/web/src/lib/stores/chat.svelte.ts`](file:///home/ubuntu/projects/lz-maniyy-v2/apps/web/src/lib/stores/chat.svelte.ts)
  *Svelte 5 streaming state, thinking token extraction, in-bubble retry navigation, multi-variant responses, and client-side UI command execution.*
- **Backend Route & Worker Streaming:** [`apps/agent/src/routes/chat.ts`](file:///home/ubuntu/projects/lz-maniyy-v2/apps/agent/src/routes/chat.ts)
  *Hono router on Cloudflare Workers, AI SDK streaming, credit pre-check guard, tool registration, SQLite D1 transactions, and compaction pipeline.*
- **Workbench & Page Component Model:** [`apps/web/src/routes/accounts/+page.svelte`](file:///home/ubuntu/projects/lz-maniyy-v2/apps/web/src/routes/accounts/+page.svelte)
  *Asymmetric 60/40 desktop layout, reactive runes synchronization with `dateFilterStore`, macro KPI headers, and mobile (<1024px) drawer isolation.*
- **Domain Contract Single Source of Truth:** [`packages/shared/src/account-detail.ts`](file:///home/ubuntu/projects/lz-maniyy-v2/packages/shared/src/account-detail.ts)
  *Strict TypeScript interfaces and DTOs shared across web, agent, and edge services.*

*Agents: Do not hallucinate structural patterns. Read the Gold Standard files before creating new components or stores.*

---

## Security & Compliance Guardrails

### Core Security Principles

1. **Principle of Least Privilege (PoLP):**
   - Services and tokens MUST only possess the minimum permissions required for their specific scope.
   - Access tokens and API keys MUST NEVER be hardcoded into test files, fixtures, or source code. Always resolve via environment variables (`process.env.REEDRICH_TEST_API_TOKEN || process.env.TEST_TOKEN || ''`).

2. **Defense in Depth (Multi-Layer Security Architecture):**
   - *Layer 1 — Pre-Commit & Git Hygiene:* Deterministic secret scanner (`bun scripts/check-secrets.ts` & `bun scripts/check-secrets.ts --history`) scanning working trees, staged diffs, commit messages, and full reachable blob histories.
   - *Layer 2 — Frontend Boundary:* Mandatory input sanitization, token masking in client logs, and immediate session invalidation on 401/403.
   - *Layer 3 — Edge / Worker Runtime:* Strict authentication middleware (`authMiddleware`) on all mutation and streaming routes, credit pre-check gating before LLM execution, and service binding isolation on Cloudflare Workers.

3. **Injection Prevention & Parameterized Queries:**
   - *SQL Injection:* ALWAYS use parameterized query bindings in Cloudflare D1 (`c.env.DB.prepare(...).bind(...)`). String concatenation or template literal interpolation into SQL strings is STRICTLY PROHIBITED.
   - *Schema Validation:* All external inputs entering Hono endpoints MUST be validated with Zod schemas before being passed to business handlers or tool execution logic.

4. **Ephemeral & Safe AI Context Handling:**
   - Chat image attachments MUST use ephemeral references (`imageRef`), NEVER stored as raw base64 strings in the D1 database.
   - User credentials, raw JWTs, and private identifiers MUST NOT be injected into agent system prompts, conversation summaries, or LLM logging payloads.
   - Financial mutation tools (`createMutationTools`, `createWalletTools`) MUST strictly enforce user ownership boundaries (`userId` isolation) and reject Cross-User or Cross-Tenant execution.

5. **Credential Masking & Hygiene:**
   - Logs and console traces MUST NEVER print raw Bearer tokens or full API keys.
   - Test fixtures requiring authentication MUST default cleanly to empty strings (`''`) or mock adapters when environment tokens are omitted, rather than falling back to real operational API tokens.

### Negative Constraints & UI Protocol

- **Zero Hardcoded Secrets (Strict Enforcement):** NEVER commit API keys (e.g. `rd_live_...`, `fp_live_...`, `gsk_...`, `AIza...`) in source code or test fixtures. Always run `bun scripts/check-secrets.ts` before staging.
- **Design System Protocol (`minimalist-ui`):**
  - Surface & Canvas: Warm Bone (`#F7F6F3`), Pure White cards (`#FFFFFF`), `1px solid #EAEAEA` borders.
  - Typography: Editorial Serif for prominent balance displays, Body (`Geist Sans` / `system-ui`), Mono (`JetBrains Mono`).
  - Iconography: **NO EMOJIS** in the UI. Always use `phosphor-svelte` with `Bold` or `Fill` weight.
  - Strict Negative Constraints: NO heavy drop shadows (< 0.05 opacity only), NO gradients or glassmorphism, NO pill-shaped large containers (pills permitted only for small status tags).
- **No Client-Side Zombie Transaction Stores:** The application SHALL NOT maintain a client-side full-history transaction array (`allTransactions`). All transaction queries must use server-driven parameterized pagination via `GET /api/v1/transactions?envelope=true`.
- **Concurrency & Signal Gating:** Network read paths to the Reedrich API must pass through `globalConcurrencyPool` with abort controller signal propagation.
---

## Git & Workflow Conventions

- **OpenSpec Lifecycle:** Complex features and multi-step refactorings MUST follow the OpenSpec schema:
  1. `/opsx-propose <name>`: Create proposal, delta specs, design, and tasks.
  2. `/opsx-apply`: Implement code strictly conforming to the tasks and specs.
  3. `/opsx-archive`: Sync delta specs into main specs and archive the change.
- **Branching Strategy:** Use `feature/<kebab-name>` or `fix/<kebab-name>`.
- **Commit Format:** Conventional Commits required:
  - `feat(...)`: New user-facing feature or capability.
  - `fix(...)`: Bug fix or calculation correction.
  - `refactor(...)`: Code cleanup without external behavior change.
  - `test(...)`: Unit or integration test additions.
- **Pushing Rules:** Never force push unless rewriting sensitive credentials. Always ensure `check-secrets.ts --history` passes clean before pushing.

---

## Dependencies & Environment

- **Package Manager:** `bun` (preferred runner: `bun`, `bunx`).
- **Svelte 5 Runes:** Use runes mode exclusively (`$state`, `$derived`, `$effect`, `$props`). Do not use legacy Svelte 3/4 reactive declarations (`$: ...`) or stores where runes are appropriate.
- **Cloudflare Workers:** Node.js built-ins in `apps/agent` must adhere to Cloudflare Workers runtime capabilities.
- **Multi-Currency Handling:** All IDR conversions and foreign currency formatting must use utilities in `$lib/utils/currency` (`fmtIDR`, `fmtCurrency`, `getConvertedBalanceInIDR`).

---

## Historical Session Learnings (Dynamic Log)

*When you consistently fail at a specific architectural nuance or encounter a repeating edge-case, add a note here to prevent future agents from making the same mistake.*

- **Point-in-Time Wallet Balances:** When querying `GET /api/v1/wallets` with `startDate` and `endDate`, the edge backend returns calculated balances in `snapshot.totalBalance` (including planned transactions for future intervals). Frontend `fetchWallets()` MUST map `balance: w.snapshot?.totalBalance ?? w.walletBalance ?? w.balance ?? 0` so the UI does not stay frozen on live balances today.
- **Virtual Env Modules in SvelteKit Tests:** SvelteKit virtual modules like `$env/static/public` are resolved by Vitest through Vite (`npx vitest run`), not Bun's standalone test runner (`bun test`). Use `bun run test:web` or `npx vitest` for web unit tests.
- **Goal Contribution Endpoints:** There is no dedicated `/goals/:id/contribute` endpoint in the Reedrich REST API. Goal progress is managed via `PATCH /goals/:goalId` with `currentAmount` or by linking a backing wallet.
- **Quoting Rules in YAML:** Rule strings containing colons (e.g. `'prefers-reduced-motion: reduce'`) in `openspec/config.yaml` must always be quoted to avoid YAML parsing ambiguity.
