# Design

## Context

The Maniyy V2 architecture features an embedded chat agent powered by Cloudflare Workers and Google Gemini (`@google/genai` native runner) with fallback to Groq (`@ai-sdk/groq`). In prior iterations, temporal dates were hardcoded into the prompt and accounting rules were insufficiently specified, leading to naive deductions (e.g. transfers counted as net worth reductions) and hallucinations during planning queries.

## Goals / Non-Goals

**Goals:**
- Eliminate all hardcoded dates by dynamically calculating runtime temporal boundaries (WIB timezone, current date, start/end of current month, start/end of next month).
- Formalize Maniyy's exact accounting matrix into the system prompt:
  - Income (+), Expense (-), Transfer ($\Delta \text{NetWorth} = 0$).
  - Correct liquidity partitioning between `spendable` and `locked` wallets.
- Incorporate multi-currency portfolio awareness (USDT, USD, crypto) with live FX conversion to IDR.
- Enrich financial tools to support category breakdowns and date-range filters without excessive token bloat.

**Non-Goals:**
- Modifying Reedrich core REST API contracts.
- Adding database schema migrations (existing D1 schema fully supports message metadata).

## Decisions

### 1. Dynamic Temporal Grounding via Intl & Date Constructor
Instead of hardcoding "September 2026", `buildSystemPrompt` will use:
```typescript
const now = new Date();
const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now);
// Compute current month start/end and next month start/end dynamically in WIB
```
*Rationale*: Ensures the agent stays accurate permanently without manual prompt updates as calendar months progress.

### 2. Explicit Accounting Engine Matrix in Prompt
The prompt will embed the accounting rules directly:
- `income`: Adds to Net Worth and respective wallet partition.
- `expense`: Subtracts from Net Worth and respective wallet partition.
- `transfer`: Net Worth $\Delta = 0$. Reduces source wallet, increases target wallet.
- `planned`: Forward-looking projection:
  $$\text{Net Worth}_{\text{future}} = \text{Net Worth}_{\text{current}} + \sum \text{Income}_{\text{planned}} - \sum \text{Expense}_{\text{planned}}$$

### 3. Multi-Currency Payload Structuring
`get_snapshot` tool will return:
```typescript
{
  netWorth: { total: number, currency: 'IDR', byCurrency: Record<string, number> },
  spendableWallets: Array<{ walletName: string, balance: number, currency: string, institution: string }>,
  lockedWallets: Array<{ walletName: string, balance: number, currency: string, institution: string }>
}
```
*Rationale*: Allows the LLM to explain foreign holdings (e.g. USDT) alongside consolidated IDR net worth.

### 4. Lean Category Breakdown Integration
`get_snapshot` will include `monthlyCashFlow.categoryBreakdown` (top 6 categories), enabling immediate responses to spending allocation queries without extra API roundtrips.

## Risks / Trade-offs

- **Prompt Token Overhead**: Adding accounting rules increases system prompt size by $\sim 300$ tokens.
  *Mitigation*: Kept concise and structured with bullet points; payload fields in tools remain lean.
- **Timezone Drift**: Workers run on UTC.
  *Mitigation*: Explicitly format using `timeZone: 'Asia/Jakarta'` (WIB) so date boundaries match Indonesian calendar dates.
