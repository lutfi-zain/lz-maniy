# Tasks

- [x] 1.1 Update `packages/shared/src/chat.ts`: trim `DEFAULT_MODELS` to 6 entries (gemini-3.1-flash-lite, gemini-3.7-flash, gemini-3.8-flash, gemini-3.1-pro-preview, groq/gpt-oss-20b, groq/gpt-oss-120b). Remove all superseded models. Add `AgentMemory` interface with `walletNicknames`, `cashflowPattern`, `formattingPreferences`, `customContext` fields.
  - **Verify**: `cd packages/shared && bun run build` succeeds. Import `AgentMemory` and `DEFAULT_MODELS` in a scratch file — `DEFAULT_MODELS.length === 6`.

- [x] 1.2 Add new tool parameter/result types to `packages/shared/src/chat.ts` (or a new `packages/shared/src/tools.ts`): `WalletCreateParams`, `BudgetParams`, `DebtLoanParams`, `GoalParams`, `RecurringTemplateParams`, `FeedbackParams`, `HorizonParams` and their response types matching Reedrich OpenAPI v1.17.0 schemas.
  - **Verify**: `cd packages/shared && bun run build` succeeds with strict type checking.

- [x] 1.3 Update `apps/web/src/lib/stores/chat.test.ts`: update model assertions to match new 6-model lineup. Verify `bun test` in `apps/web` passes.
  - **Verify**: `cd apps/web && bun test` passes.

- [x] 2.1 Create `apps/agent/src/agent/tools/wallet-management.ts`: implement `list_wallets` (GET /api/v1/wallets), `create_wallet` (POST), `update_wallet` (PATCH), `delete_wallet` (DELETE) using the `tool()` + zod pattern from existing `financial.ts`. Factory signature: `createWalletTools(reedrichUrl, token, fetcher?)`.
  - **Verify**: `cd apps/agent && bun test` — new unit test `wallet-management.test.ts` passes with mocked fetch.

- [x] 2.2 Create `apps/agent/src/agent/tools/budget-management.ts`: implement `list_budgets` (GET /api/v1/budgets), `create_budget` (POST), `update_budget` (PATCH), `delete_budget` (DELETE).
  - **Verify**: Unit test passes.

- [x] 2.3 Create `apps/agent/src/agent/tools/debt-loan.ts`: implement `list_debts_loans` (GET /api/v1/debts-loans), `create_debt_loan` (POST), `repay_debt_loan` (POST /:id/repay), `update_debt_loan` (PATCH), `delete_debt_loan` (DELETE).
  - **Verify**: Unit test passes.

- [x] 2.4 Create `apps/agent/src/agent/tools/goal-management.ts`: implement `list_goals` (GET /api/v1/goals), `create_goal` (POST), `update_goal` (PATCH), `delete_goal` (DELETE), `link_goal_wallet` (POST /:id/wallets), `unlink_goal_wallet` (DELETE /:id/wallets/:wid).
  - **Verify**: Unit test passes.

- [x] 2.5 Create `apps/agent/src/agent/tools/recurring.ts`: implement `list_recurring` (GET /api/v1/recurring-templates), `create_recurring` (POST), `update_recurring` (PATCH), `delete_recurring` (DELETE), `apply_recurring` (POST /:id/apply).
  - **Verify**: Unit test passes.

- [x] 2.6 Create `apps/agent/src/agent/tools/feedback.ts`: implement `submit_feedback` (POST /api/v1/feedback) with title, content, type parameters.
  - **Verify**: Unit test passes.

- [x] 2.7 Add `financial_summary` (GET /api/v1/summary with startDate, endDate, baseCurrency params) and `horizon_projection` (GET /api/v1/analytics/horizon with months, periods, filter params) to `apps/agent/src/agent/tools/financial.ts`. Add `update_profile` (PATCH /api/v1/me).
  - **Verify**: Unit test passes.

- [x] 2.8 Extend category tools in `apps/agent/src/agent/tools/financial.ts`: add `create_category` (POST /api/v1/categories), `update_category` (PATCH), `delete_category` (DELETE) alongside existing read-only `get_categories`.
  - **Verify**: Unit test passes.

## 3. Agent Memory

- [x] 3.1 Create D1 migration `apps/agent/db/migrations/0005_agent_memory.sql`: `CREATE TABLE agent_memory` with columns `user_id TEXT PRIMARY KEY`, `wallet_nicknames TEXT DEFAULT '{}'`, `cashflow_pattern TEXT DEFAULT ''`, `formatting_preferences TEXT DEFAULT '[]'`, `custom_context TEXT DEFAULT ''`, `updated_at TEXT`.
  - **Verify**: `cd apps/agent && bunx wrangler d1 migrations apply maniyy-agent-db --local` succeeds.

- [x] 3.2 Add `getAgentMemory(db, userId)` and `upsertAgentMemory(db, userId, partial)` queries to `apps/agent/src/db/queries.ts`.
  - **Verify**: Unit test with local D1 passes.

- [x] 3.3 Create `apps/agent/src/agent/tools/memory.ts`: implement `save_memory` tool that accepts key (walletNicknames | cashflowPattern | formattingPreferences | customContext) and value, calls `upsertAgentMemory`. Factory signature: `createMemoryTools(db, userId)`.
  - **Verify**: Unit test passes.

## 4. Gemini Native Runner Parity

- [x] 4.1 Create utility `apps/agent/src/agent/gemini-declarations.ts`: implement `buildGeminiDeclarations(tools: Record<string, CoreTool>): FunctionDeclaration[]` that converts zod schemas to Google `Type` enum declarations. Handle string, number, boolean, object, array, enum, and optional types.
  - **Verify**: Unit test — roundtrip every existing tool through the converter, assert valid `FunctionDeclaration[]` output with correct types and required fields.

- [x] 4.2 Refactor `apps/agent/src/agent/gemini-native.ts`: replace hardcoded `toolDeclarations` array and `executeTool` switch with dynamic dispatch using `buildGeminiDeclarations` and `tools[name].execute(args, context)`. Import all tool factories (financial, mutations, wallet, budget, debt-loan, goal, recurring, feedback, memory, ui-commands).
  - **Verify**: `cd apps/agent && bun test` passes. Manual test: Gemini model can call `open_drawer`, `list_wallets`, `create_budget` (previously missing tools).

## 5. System Prompt Rewrite

- [x] 5.1 Refactor `apps/agent/src/agent/system-prompt.ts`: split monolithic template string into composable section builders (`buildIdentitySection`, `buildTemporalSection`, `buildMemorySection`, `buildPageContextSection`, `buildToolCatalog`, `buildBehaviorProtocol`, `buildAccountingPrinciples`, `buildCommunicationStyle`). Update `buildSystemPrompt` signature to accept optional `AgentMemory` parameter.
  - **Verify**: Unit test — `buildSystemPrompt` with and without memory produces valid prompt. Each section builder tested independently.

- [x] 5.2 Implement `buildBehaviorProtocol()`: encode the 7 curiosity patterns (data-first, verify-after-mutate, multi-step planning, proactive insight, confirmation gate, error protocol, tool result evaluation) as explicit Indonesian-language instructions.
  - **Verify**: `buildBehaviorProtocol()` output includes keywords: "panggil minimal satu tool", "setelah mencatat", "konfirmasi", "retry", "evaluasi hasil".

- [x] 5.3 Implement `buildToolCatalog()`: auto-generate tool catalog section listing all 25+ tools with concise descriptions, parameter summaries, and usage guidance (when to use each tool, what it does NOT do).
  - **Verify**: Tool catalog includes every tool name from all tool files.

- [x] 5.4 Implement `buildMemorySection(agentMemory?)`: inject wallet nicknames as ID-to-name mapping, cashflow pattern, formatting preferences, and custom context. Graceful no-op when memory is undefined.
  - **Verify**: Unit test with sample memory produces section with wallet mappings; undefined memory produces empty section.

## 6. Chat Route Integration

- [x] 6.1 Update `apps/agent/src/routes/chat.ts`: import all new tool factories, spread them into the `tools` object for AI SDK path. Load agent memory via `getAgentMemory(db, userId)` and pass to `buildSystemPrompt`. Pass `db` and `userId` to `createMemoryTools`.
  - **Verify**: `bun run check` and `bun test` pass in `apps/agent`.

- [x] 6.2 Update `apps/agent/src/agent/models.ts`: replace `AVAILABLE_MODELS` with the curated 6-model list matching design.md D5.
  - **Verify**: `GET /api/models` returns exactly 6 models when tested locally with `bunx wrangler dev`.

## 7. Eval & Validation

- [x] 7.1 Update `apps/agent/eval/dataset.ts`: add test cases for curiosity patterns — balance query must call snapshot, planning query must call snapshot + transactions, wallet creation must call wallet tool, debt query must call debt tool. Update existing test cases if tool names changed.
  - **Verify**: `cd apps/agent && bun run eval/run-gemini.ts` — all test cases pass with ≥70% average score.

- [x] 7.2 Run full test suite and type check across monorepo: `bun test` in `packages/shared`, `apps/agent`, `apps/web`. Run `bun run check` in `apps/web`.
  - **Verify**: All tests pass, no type errors, no regressions.
