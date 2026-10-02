# Design

## Context

See proposal.md for motivation. The agent backend (`apps/agent`) uses two parallel code paths:
1. **AI SDK path** (`routes/chat.ts` → `streamText` with `tools` object) — used for Groq/OpenCode providers. Tools are defined via Vercel AI SDK `tool()` helper with zod schemas.
2. **Gemini native path** (`agent/gemini-native.ts` → `@google/genai` SDK `chats.create`) — used for Gemini provider. Tools are manually declared as `FunctionDeclaration[]` with Google's `Type` enum.

Both paths share the same system prompt builder (`agent/system-prompt.ts`) and Reedrich REST tool implementations (`agent/tools/financial.ts`, `mutations.ts`, `ui-commands.ts`).

Current tool files and their scope:
- `financial.ts`: `get_snapshot`, `list_transactions`, `get_categories`, `get_user_profile` (4 tools)
- `mutations.ts`: `create_transaction`, `create_transfer`, `update_transaction`, `delete_transaction` (4 tools)
- `ui-commands.ts`: `navigate_page`, `change_filter`, `change_tab`, `change_date_range`, `open_drawer`, `open_transaction_form`, `focus_element` (7 tools)

The Gemini native runner only registers 8 of these 15 AI SDK tools.

D1 database currently has `conversations`, `messages`, and `user_settings` tables. Agent memory requires a new `agent_memory` table.

## Goals / Non-Goals

**Goals:**
- Full Reedrich API tool coverage via REST (not MCP) across both code paths
- System prompt that drives proactive, multi-step tool usage
- Agent memory persistence for personalized context
- Clean, proven model lineup

**Non-Goals:**
- Frontend component changes
- MCP protocol integration (using REST API only)
- Real-time streaming of tool execution status to frontend (existing SSE protocol sufficient)

## Decisions

### D1: Tool File Organization

**Decision**: Organize new tools into domain-specific files mirroring the Reedrich API tag groups.

```
apps/agent/src/agent/tools/
├── financial.ts          # get_snapshot, list_transactions, get_categories,
│                         # get_user_profile, financial_summary, horizon_projection
├── mutations.ts          # create_transaction, create_transfer, update_transaction,
│                         # delete_transaction
├── wallet-management.ts  # list_wallets, create_wallet, update_wallet, delete_wallet
├── budget-management.ts  # list_budgets, create_budget, update_budget, delete_budget
├── debt-loan.ts          # list_debts_loans, create_debt_loan, repay_debt_loan,
│                         # update_debt_loan, delete_debt_loan
├── goal-management.ts    # list_goals, create_goal, update_goal, delete_goal,
│                         # link_goal_wallet, unlink_goal_wallet
├── recurring.ts          # list_recurring, create_recurring, update_recurring,
│                         # delete_recurring, apply_recurring
├── feedback.ts           # submit_feedback
├── memory.ts             # save_memory, get_memory
└── ui-commands.ts        # (unchanged)
```

**Rationale**: Mirrors Reedrich API domain structure, keeps files under ~150 lines, allows incremental testing. All tool files share the same `createXxxTools(reedrichUrl, token, fetcher?)` factory pattern.

**Alternative considered**: Single mega-file with all tools. Rejected: 400+ lines, hard to navigate.

### D2: Gemini Native Tool Sync Strategy

**Decision**: Generate Gemini `FunctionDeclaration[]` from the AI SDK tool definitions rather than maintaining two separate declaration lists.

Create a utility `buildGeminiDeclarations(tools: Record<string, CoreTool>): FunctionDeclaration[]` that maps zod schemas to Google `Type` enum objects. The `executeTool` switch becomes a simple dynamic dispatch: `tools[name].execute(args, { toolCallId, messages: [] })`.

**Rationale**: Eliminates the parity problem at the root. Any tool added to the AI SDK set is automatically available in Gemini native.

**Alternative considered**: Manual duplication. Rejected: root cause of current 7-tool gap.

### D3: System Prompt Architecture

**Decision**: Restructure `buildSystemPrompt` into composable sections:

```typescript
function buildSystemPrompt(
  pageContext: PageContext,
  userName: string,
  agentMemory?: AgentMemory
): string {
  return [
    buildIdentitySection(userName),
    buildTemporalSection(),           // dates, current month boundaries
    buildMemorySection(agentMemory),  // wallet nicknames, cashflow pattern, preferences
    buildPageContextSection(pageContext),
    buildToolCatalog(),               // all tools with usage guidance
    buildBehaviorProtocol(),          // NEW: curiosity, verification, error handling
    buildAccountingPrinciples(),
    buildCommunicationStyle(agentMemory?.formattingPreferences),
  ].join('\n\n');
}
```

The new `buildBehaviorProtocol()` section encodes the 7 prompt patterns:

1. **Data-First**: "Sebelum menjawab pertanyaan finansial, panggil minimal satu tool data (get_snapshot, financial_summary, list_transactions)."
2. **Verify-After-Mutate**: "Setelah mencatat/mengubah/menghapus transaksi, panggil get_snapshot dan laporkan saldo terkini."
3. **Multi-Step Planning**: "Untuk pertanyaan proyeksi: panggil get_snapshot + list_transactions (filter planned) + financial_summary. Sajikan perhitungan step-by-step."
4. **Proactive Insight**: "Jika data menunjukkan: budget >80%, safe-to-spend <Rp 500K, goal behind pace — sampaikan proaktif dengan saran."
5. **Confirmation Gate**: "Untuk operasi create/update/delete: tampilkan draft rincian, minta konfirmasi eksplisit user."
6. **Error Protocol**: "Tool error? Baca pesan error. Retry 1x jika transient/argumen salah. Masih gagal? Laporkan ke user, jangan fabrikasi."
7. **Tool Result Evaluation**: "Evaluasi hasil tool sebelum menjawab. Jika data kosong/irrelevant, panggil tool lagi dengan parameter berbeda atau tanya user."

**Rationale**: Composable sections allow memory injection, tool catalog auto-generation, and independent testing. Behavior protocol is explicit rather than hoping the model infers it.

### D4: Agent Memory Storage

**Decision**: Store agent memory in D1 (not KV) alongside existing tables.

```sql
CREATE TABLE agent_memory (
  user_id TEXT PRIMARY KEY,
  wallet_nicknames TEXT DEFAULT '{}',  -- JSON object
  cashflow_pattern TEXT DEFAULT '',
  formatting_preferences TEXT DEFAULT '[]',  -- JSON array
  custom_context TEXT DEFAULT '',
  updated_at TEXT DEFAULT (datetime('now'))
);
```

**Rationale**: D1 is already bound and used for conversations/messages. Memory is small (<4KB per user), infrequently updated, and benefits from the transactional guarantees D1 provides. KV would require a new binding for marginal benefit.

### D5: Model Cleanup Approach

**Decision**: Update `AVAILABLE_MODELS` in `apps/agent/src/agent/models.ts` and `DEFAULT_MODELS` in `packages/shared/src/chat.ts` simultaneously. The frontend loads models from `/api/models` on mount and merges with `DEFAULT_MODELS`, so both lists must be consistent.

Final model list (6 models):

| Provider | Model | Display Name | Capabilities |
|----------|-------|-------------|-------------|
| gemini | gemini-3.1-flash-lite | Gemini 3.1 Flash Lite | vision, tools, thinking |
| gemini | gemini-3.7-flash | Gemini 3.7 Flash | vision, tools, thinking |
| gemini | gemini-3.8-flash | Gemini 3.8 Flash (High Tier) | vision, tools, thinking |
| gemini | gemini-3.1-pro-preview | Gemini 3.1 Pro (Preview) | vision, tools, thinking |
| groq | openai/gpt-oss-20b | GPT-OSS 20B (Groq Fast) | tools |
| groq | openai/gpt-oss-120b | GPT-OSS 120B (Groq Large) | tools |

## Risks / Trade-offs

1. **Gemini declaration auto-generation**: Zod-to-Google-Type mapping must handle optionals, enums, nested objects. Risk: edge case schema mismatches. Mitigation: unit test every tool declaration roundtrip.

2. **System prompt size**: Adding tool catalog for 25+ tools and behavior protocol increases prompt tokens. Current prompt is ~1200 tokens; new prompt estimated ~2500 tokens. Risk: slightly higher cost per request. Mitigation: concise tool descriptions, combine related tools (e.g. CRUD as one tool with action parameter) only if model reliability doesn't degrade.

3. **Agent memory bootstrap**: New users start with empty memory. Risk: curiosity patterns may over-call tools on first interaction. Mitigation: system prompt behavior is useful even without memory; memory enriches but isn't required.

4. **Confirmation gate friction**: Requiring confirmation for every mutation adds a round-trip. Risk: user fatigue on batch recording. Mitigation: allow batch confirmation ("catat semua" after showing draft list), and skip confirmation for planned transactions that are future-dated.

## Test Strategy

### Unit Tests (Vitest)

- **Tool factory tests**: Each new tool file gets a test that mocks `fetch`, verifies correct URL/method/headers, and checks response mapping.
- **Gemini declaration generator**: Test that `buildGeminiDeclarations` produces valid `FunctionDeclaration[]` for every tool, including parameter types and required fields.
- **System prompt builder**: Test each section builder in isolation; verify memory injection, tool catalog completeness, and behavior protocol presence.
- **Model list**: Assert `AVAILABLE_MODELS.length === 6` and each entry has required fields.

### Integration Tests (Vitest with Workers pool)

- **Tool execution roundtrip**: Test tools against Reedrich test account with real API calls (guarded by `REEDRICH_TEST_API_TOKEN` env var).
- **Agent memory CRUD**: Test D1 migration, insert, update, and retrieval of agent memory.

### Eval Tests

- Update `eval/dataset.ts` with new test cases exercising curiosity patterns:
  - TC: "saldo saya berapa?" → must call `get_snapshot` OR `financial_summary` before answering
  - TC: "bikin dompet Cash Rumah" → must call wallet create tool
  - TC: "hutang saya ke Abi berapa?" → must call debt/loan list tool
  - TC: "planning bulan depan" → must call `get_snapshot` AND `list_transactions`
