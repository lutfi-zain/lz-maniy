# Tasks

## 1. Mutations Tools Alignment (`mutations.ts`)

- [x] 1.1 In `apps/agent/src/agent/tools/mutations.ts`, update `create_transaction` parameters: update `date` description to specify ISO-8601 (`YYYY-MM-DDTHH:mm:ss+07:00`) or `YYYY-MM-DD`, add optional `transactionDate: z.string().optional()`, and ensure `adminFee` and `budgetId` are forwarded to the API payload
- [x] 1.2 In `apps/agent/src/agent/tools/mutations.ts`, update `update_transaction` parameters: update `date` description for ISO-8601 timestamps, add optional `transactionDate: z.string().optional()`, and add `budgetId: z.string().nullable().optional()`
- [x] 1.3 In `apps/agent/src/agent/tools/mutations.ts`, update `create_transfer` parameters: add `categoryId: z.string().optional()` and update `date` description for ISO-8601 timestamps

## 2. Financial Query Tools Alignment (`financial.ts`)

- [x] 2.1 In `apps/agent/src/agent/tools/financial.ts`, update `list_transactions` parameters: add `q: z.string().optional()`, `type: z.enum(['expense', 'income', 'transfer']).optional()`, `isPlanned: z.union([z.boolean(), z.number()]).optional()`, `budgetId: z.string().optional()`, `targetWalletId: z.string().optional()`, and `orderBy: z.enum(['date_desc', 'date_asc', 'amount_desc', 'amount_asc']).optional()`
- [x] 2.2 In `apps/agent/src/agent/tools/financial.ts`, update `list_transactions` output mapping: restore `id: t.transactionId`, return full `date: t.transactionDate` (without `.slice(0, 10)`), and return `budgetId: t.transactionBudgetId` and `categoryId: t.transactionCategoryId`
- [x] 2.3 In `apps/agent/src/agent/tools/financial.ts`, implement new `get_transaction` tool: accepts `transactionId: z.string()`, calls `GET /api/v1/transactions/{transactionId}`, and returns the full transaction record

## 3. Recurring Templates Alignment (`recurring.ts`)

- [x] 3.1 In `apps/agent/src/agent/tools/recurring.ts`, update `apply_recurring` parameters: add optional `transactionId: z.string().optional()`, `executionDate: z.string().optional()`, and `actualAmount: z.number().positive().optional()`
- [x] 3.2 In `apps/agent/src/agent/tools/recurring.ts`, update `apply_recurring` execution: pass request body with `{ transactionId, executionDate, actualAmount }` to `POST /api/v1/recurring-templates/{templateId}/apply`
- [x] 3.3 In `apps/agent/src/agent/tools/recurring.ts`, implement new `get_recurring` tool: accepts `templateId: z.string()`, calls `GET /api/v1/recurring-templates/{templateId}`, and returns the recurring template record

## 4. Entity Drilldown Tools (Get by ID)

- [x] 4.1 In `apps/agent/src/agent/tools/wallet-management.ts`, implement new `get_wallet` tool: accepts `walletId: z.string()`, calls `GET /api/v1/wallets/{walletId}`, and returns the wallet record
- [x] 4.2 In `apps/agent/src/agent/tools/budget-management.ts`, implement new `get_budget` tool: accepts `budgetId: z.string()`, calls `GET /api/v1/budgets/{budgetId}`, and returns the budget record
- [x] 4.3 In `apps/agent/src/agent/tools/goal-management.ts`, implement new `get_goal` tool: accepts `goalId: z.string()`, calls `GET /api/v1/goals/{goalId}`, and returns the goal record

## 5. System Prompt & Tool Registration

- [x] 5.1 In `apps/agent/src/agent/system-prompt.ts`, update `buildToolCatalog`: document the 5 new drilldown tools (`get_transaction`, `get_wallet`, `get_budget`, `get_goal`, `get_recurring`), updated mutation parameters (`budgetId`, `categoryId`, ISO-8601 timestamps), and `list_transactions` search and id fields
- [x] 5.2 In `apps/agent/src/agent/system-prompt.ts`, update `buildBehaviorProtocol` & `buildAccountingPrinciples`: explain how to construct ISO-8601 timestamps with WIB (`+07:00`) for transactions with specific hours/minutes
- [x] 5.3 In `apps/agent/src/agent/gemini-native.ts` and `apps/agent/src/routes/chat.ts`, verify that all newly added tools are included in the tool maps and declarations

## 6. Verification & Test Suites

- [x] 6.1 Update and expand unit tests in `apps/agent/src/agent/tools/__tests__/tools.test.ts` covering:
  - `create_transaction` and `update_transaction` with ISO-8601 timestamps and `budgetId`
  - `create_transfer` with `categoryId` and ISO-8601 timestamp
  - `list_transactions` returning `id` and full `date`, plus query parameter forwarding
  - `apply_recurring` with override parameters
  - All 5 new drilldown tools (`get_transaction`, `get_wallet`, `get_budget`, `get_goal`, `get_recurring`)
- [x] 6.2 Run `bun test` in `apps/agent` and verify all tests pass
- [x] 6.3 Run `tsc --noEmit` in `packages/shared`, `apps/agent`, and `apps/web` to ensure strict type compliance
