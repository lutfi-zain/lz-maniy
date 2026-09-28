# Proposal

## Why

The current AI financial assistant operates with rigid, hardcoded temporal anchors and lacks semantic awareness of Maniyy's accounting engine (specifically: treating intra-portfolio transfers as net worth reductions instead of zero-delta moves, lacking multi-currency FX awareness, and lacking category spending analysis). By elevating the agent's system prompt to a dynamic, temporal-grounded reasoning engine with deep accounting awareness, the agent will reliably perform multi-step financial projections and drilldown analyses matching Frontend calculation rules.

## What Changes

- **Eliminate Hardcoded Dates**: Replace static month/year prompts with runtime dynamic temporal grounding computed from the host clock in `Asia/Jakarta` timezone (current date, start/end of current month, start/end of next month, relative horizons).
- **Embed Maniyy Accounting Engine Rules**: Teach the agent exact accounting rules matching `networth-timeline.ts`:
  - `income` increases Net Worth (+).
  - `expense` decreases Net Worth (-).
  - `transfer` has zero impact on Net Worth ($\Delta = 0$), only moving funds between wallets or shifting liquidity ratios between `spendable` and `locked`.
  - Planned projection formula: $\text{Projected Net Worth} = \text{Current Net Worth} + \sum \text{Planned Income} - \sum \text{Planned Expense}$.
- **Multi-Currency (FX) Awareness**: Equip the agent to identify non-IDR wallet balances (e.g. USDT, USD) and account for foreign currency valuations during consolidated net worth synthesis.
- **Category & Budget Spending Analysis**: Teach the agent to analyze planned and settled category breakdown to answer questions regarding highest-spending categories, budget burn rates, and pacing alerts.
- **Complete Tool Schema Awareness**: Provide the agent with full semantic understanding of tool inputs, outputs, and query parameters (`startDate`, `endDate`, `isPlanned`, `walletId`, `categoryId`).

## Capabilities

### New Capabilities
- `agent-accounting-reasoning`: Formal specification for the AI agent's financial reasoning engine, dynamic temporal grounding, accounting matrix rules, and tool orchestration.

### Modified Capabilities
<!-- None -->

## Impact

- `apps/agent/src/agent/system-prompt.ts`: Dynamic temporal calculation and comprehensive accounting rules.
- `apps/agent/src/agent/gemini-native.ts`: Full tool declaration schema with category/budget/date parameters.
- `apps/agent/src/agent/tools/financial.ts`: Output payload enrichment with currency and category metadata.
- `apps/agent/eval/`: Updated evaluation test cases covering multi-currency, category drilldowns, and zero-delta transfers.
