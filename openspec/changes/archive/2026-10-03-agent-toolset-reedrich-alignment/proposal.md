# Proposal

## Why

The AI agent's exposed tools and schemas suffer from significant blindspots and parameter mismatches compared to the authoritative Reedrich REST API. Specifically, transaction creation and updates hardcode `date` as a date-only string (`YYYY-MM-DD`), causing the agent to reject time updates even though the API natively supports full ISO-8601 timestamps (`date-time`); `list_transactions` truncates timestamps, drops `transactionId`, and omits search and filter parameters; `update_transaction` and `create_transfer` drop supported fields (`budgetId`, `categoryId`); `apply_recurring` cannot accept override payloads; and entity-level GET-by-ID endpoints are entirely absent from the agent toolset. Aligning the agent tool definitions with the Reedrich OpenAPI specification eliminates these blindspots and enables precise financial mutations and inquiries.

## What Changes

- **Transaction & Transfer Mutations**:
  - Update `create_transaction` to support `date` as ISO-8601 timestamp (`date-time`) or date string, with optional `transactionDate` alias, `adminFee`, and `budgetId`.
  - Update `update_transaction` to support `date` as ISO-8601 timestamp (`date-time`), `transactionDate`, and `budgetId`.
  - Update `create_transfer` to support `categoryId` and ISO-8601 `date`.
- **Transaction Query & Mapping (`list_transactions`)**:
  - Preserve `transactionId` in output records so the agent can reference and update transactions.
  - Return complete ISO-8601 timestamp `transactionDate` without truncating hours and minutes.
  - Return `budgetId` and `categoryId` in mapped transaction items.
  - Add query filter parameters: `q`/`search` (keyword search), `type` (`expense`/`income`/`transfer`), `isPlanned` (boolean/number), `budgetId`, `targetWalletId`, and `orderBy`.
- **Recurring Template Realization (`apply_recurring`)**:
  - Expand `apply_recurring` parameters to accept optional `transactionId`, `executionDate` (ISO timestamp), and `actualAmount` (for recurring adjustments).
- **Entity Drilldown Tools (Get by ID)**:
  - Add `get_transaction`: retrieve single transaction details via `GET /api/v1/transactions/{transactionId}`.
  - Add `get_wallet`: retrieve single wallet details via `GET /api/v1/wallets/{walletId}`.
  - Add `get_budget`: retrieve single budget details via `GET /api/v1/budgets/{budgetId}`.
  - Add `get_goal`: retrieve single goal details via `GET /api/v1/goals/{goalId}`.
  - Add `get_recurring`: retrieve single recurring template via `GET /api/v1/recurring-templates/{templateId}`.
- **System Prompt & Gemini Declarations**:
  - Update system prompt tool catalog and behavioral guidelines explaining ISO-8601 date-time support, transaction ID presence, and drilldown capabilities.
  - Ensure `gemini-declarations.ts` accurately maps updated Zod schemas to Gemini API function declarations.

## Capabilities

### Modified Capabilities
- `agent-chat/backend`: Expanded tools (`mutations`, `financial`, `recurring`, drilldowns), parameter alignment, output mappings, and system prompt synchronization.
- `agent-chat/shared-types`: Updated shared tool parameter/result payload contracts where applicable.

### Non-Goals
- Modifying the Reedrich REST API itself (the backend edge API already supports these schemas).
- Implementing UI changes in the SvelteKit frontend (frontend already handles these types).
- Adding auth/login tools (auth is handled via token passthrough).
