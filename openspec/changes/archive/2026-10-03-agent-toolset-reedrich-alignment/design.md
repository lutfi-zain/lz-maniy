# Design

## Context

The agent backend in `apps/agent/src/agent/tools/` exposes tools wrapped via AI SDK `tool({...})` and registered into both the AI SDK runner (`streamText`) and the native Gemini runner (`createGeminiRunner` with `buildGeminiDeclarations`). While the Reedrich REST API v1.17.0 supports rich operations—including full-fidelity ISO-8601 timestamps (`date-time`), keyword searches, category assignments on transfers, budget linkages on transactions, occurrence overrides on recurring applications, and entity detail endpoints (`/transactions/{id}`, etc.)—the agent tool declarations are constrained by outdated, narrow Zod parameter definitions and lossy output mappings.

## Goals / Non-Goals

**Goals:**
- Eliminate parameter mismatches across all transaction and transfer mutation tools so they match the Reedrich OpenAPI specification.
- Enable full-fidelity timestamp support (ISO-8601 strings with hours, minutes, and WIB timezone offset) while maintaining backward compatibility with `YYYY-MM-DD`.
- Restore `transactionId`, full `transactionDate`, and relation IDs (`budgetId`, `categoryId`) in `list_transactions` output.
- Add search and status filter parameters (`q`/`search`, `type`, `isPlanned`, `budgetId`, `targetWalletId`, `orderBy`) to `list_transactions`.
- Support realization overrides (`transactionId`, `executionDate`, `actualAmount`) in `apply_recurring`.
- Introduce drilldown tools (`get_transaction`, `get_wallet`, `get_budget`, `get_goal`, `get_recurring`).
- Synchronize system prompt instructions and ensure Gemini tool declarations properly translate Zod schemas to Gemini API FunctionDeclarations.

**Non-Goals:**
- Altering the Reedrich REST API implementation itself.
- Changing frontend UI components (SvelteKit).
- Altering local D1 database tables (this change concerns agent tools querying the Reedrich API).

## Decisions

### D1: Timestamp Format Standardization on ISO-8601 Strings with Dynamic Jakarta Timezone
- **Decision**: Define `date` across `create_transaction`, `update_transaction`, and `create_transfer` as `z.string().describe('Tanggal & waktu transaksi. Format ISO-8601 lengkap (YYYY-MM-DDTHH:mm:ss+07:00) jika ada waktu/jam, atau YYYY-MM-DD jika tanggal saja. Waktu default adalah WIB (+07:00).')`. Also support optional `transactionDate` as an alias.
- **Rationale**: The Reedrich API uses JSON Schema `format: "date-time"`, which accepts full ISO-8601 strings. If a user says "makan siang tadi jam 12:30", the agent will construct `2026-10-03T12:30:00+07:00`. If only a date is mentioned, it can supply `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss`. Both are valid in Reedrich.
- **Alternative considered**: Requiring separate `date` and `time` parameters. Rejected because standard ISO-8601 already combines date and time, matching standard API conventions.

### D2: Include `id` and Full `date` in `list_transactions` Output
- **Decision**: Update `list_transactions` output mapping to return:
  ```typescript
  return items.map((t) => ({
      id: t.transactionId,
      date: t.transactionDate, // Preserve full ISO timestamp
      amount: t.transactionAmount,
      walletId: t.transactionWalletId,
      targetWalletId: t.transactionTargetWalletId ?? undefined,
      categoryId: t.transactionCategoryId ?? undefined,
      budgetId: t.transactionBudgetId ?? undefined,
      type: t.transactionType,
      isPlanned: t.transactionIsPlanned === 1,
      desc: (t.transactionDescription ?? '').slice(0, 100)
  }));
  ```
- **Rationale**: Currently, `t.transactionId` was missing completely, making it impossible for the agent to know which ID to pass to `update_transaction` or `delete_transaction`. Truncating `t.transactionDate.slice(0, 10)` also hid the recorded hour/minute from the agent.

### D3: Expose Filter Query Parameters in `list_transactions`
- **Decision**: Extend parameters for `list_transactions` in `financial.ts`:
  - `q`: `z.string().optional().describe('Kata kunci pencarian deskripsi transaksi')`
  - `type`: `z.enum(['expense', 'income', 'transfer']).optional()`
  - `isPlanned`: `z.union([z.boolean(), z.number()]).optional().describe('Filter transaksi rencana (true/1) atau riil (false/0)')`
  - `budgetId`: `z.string().optional().describe('Filter berdasarkan ID budget')`
  - `targetWalletId`: `z.string().optional().describe('Filter wallet tujuan untuk transfer')`
  - `orderBy`: `z.enum(['date_desc', 'date_asc', 'amount_desc', 'amount_asc']).optional().default('date_desc')`
- **Rationale**: The Reedrich API already implements these query parameters. Exposing them in the tool parameters allows the model to perform targeted queries rather than scanning hundreds of transactions client-side.

### D4: Add Entity Drilldown Tools (Get by ID)
- **Decision**: Add 5 drilldown tools across their respective tool files:
  1. `get_transaction` in `financial.ts`: `GET /api/v1/transactions/{transactionId}`
  2. `get_wallet` in `wallet-management.ts`: `GET /api/v1/wallets/{walletId}`
  3. `get_budget` in `budget-management.ts`: `GET /api/v1/budgets/{budgetId}`
  4. `get_goal` in `goal-management.ts`: `GET /api/v1/goals/{goalId}`
  5. `get_recurring` in `recurring.ts`: `GET /api/v1/recurring-templates/{templateId}`
- **Rationale**: When an agent needs to verify or inspect a specific entity after mutation or user question, scanning an entire list is wasteful of context tokens and time. Direct GET by ID is supported natively by Reedrich.

### D5: Extend `apply_recurring` Parameter Schema
- **Decision**: In `recurring.ts`, update `apply_recurring`:
  ```typescript
  parameters: z.object({
      templateId: z.string().describe('ID UUID template recurring yang akan direalisasikan'),
      transactionId: z.string().optional().describe('ID transaksi terencana spesifik yang ingin direalisasikan (opsional, disukai)'),
      executionDate: z.string().optional().describe('Tanggal eksekusi realisasi dalam format ISO-8601 (opsional)'),
      actualAmount: z.number().positive().optional().describe('Nominal riil aktual jika berbeda dengan template (opsional)')
  })
  ```
- **Rationale**: Matches the OpenAPI `POST /api/v1/recurring-templates/{templateId}/apply` request body.

### D6: Update Tool Catalog in `system-prompt.ts`
- **Decision**: Add documentation of new parameters, drilldown tools, and ISO timestamp behavior to `buildToolCatalog` and `buildBehaviorProtocol` in `system-prompt.ts`.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| **Gemini function declaration schema parsing** | `zodToGeminiSchema` in `gemini-declarations.ts` handles Zod String, Number, Boolean, Enum, Array, Object, and Union. All new parameters use standard Zod primitives that map directly to Gemini FunctionDeclarations. |
| **Model hallucinating incorrect timezone offsets** | System prompt explicitly provides the current Jakarta time and defines WIB (`+07:00`) as the reference timezone. |
| **Increased tool count impacting model context** | The 5 new drilldown tools are compact and focused; they replace repetitive multi-step list queries, reducing overall token consumption. |
