# agent-accounting-reasoning Specification

## Purpose
Specifies the AI assistant's financial reasoning engine, dynamic temporal awareness without hardcoded dates, Maniyy accounting engine rules, multi-currency portfolio valuation, and category spending analytics.

## Requirements

### Requirement: Dynamic Temporal Grounding
The agent system prompt SHALL compute calendar horizons dynamically at runtime from the system clock anchored to the `Asia/Jakarta` (WIB) timezone, without hardcoded calendar dates or static month names.

#### Scenario: Relative Month Resolution
- **WHEN** user asks a temporal financial question such as "berapa net worth bulan depan?" or "pengeluaran bulan ini apa saja?"
- **THEN** the system dynamically resolves the start and end dates of the current month and subsequent month using runtime date calculations
- **THEN** the system instructs the LLM with the computed dates (e.g. `startDate` and `endDate`) so tool parameters are precisely bound without guesswork

### Requirement: Maniyy Accounting Matrix and Net Worth Calculations
The agent SHALL strictly adhere to Maniyy's accounting matrix rules when performing calculations, projections, or balance evaluations.

#### Scenario: Zero-Delta Intra-Wallet Transfers
- **WHEN** the agent evaluates transactions of type `transfer`
- **THEN** the agent treats the transaction as having zero impact ($\Delta = 0$) on consolidated Net Worth
- **THEN** the agent accounts for liquidity shifts between `spendable` and `locked` partitions when the transfer occurs between wallets with differing `isLocked` flags

#### Scenario: Net Worth Projection with Planned Transactions
- **WHEN** user asks for a future Net Worth projection incorporating planned transactions
- **THEN** the agent queries the current snapshot via `get_snapshot` and future planned transactions via `list_transactions`
- **THEN** the agent calculates: $\text{Projected Net Worth} = \text{Current Net Worth} + \sum \text{Planned Income} - \sum \text{Planned Expense}$
- **THEN** the agent presents the calculation transparently in a markdown summary table displaying Starting Net Worth, Total Planned Income, Total Planned Expense, and Final Projected Net Worth

### Requirement: Multi-Currency and FX Portfolio Awareness
The agent SHALL recognize multi-currency wallet assets (such as USDT, USD, or crypto) and reflect consolidated IDR values while citing original currency denominations.

#### Scenario: Multi-Currency Valuation Query
- **WHEN** user asks about asset distribution or holdings in foreign currencies
- **THEN** the agent identifies non-IDR wallet balances from the account snapshot
- **THEN** the agent reports both the foreign currency amount (e.g. `115.61 USDT`) and its consolidated IDR equivalent based on live exchange rates from the snapshot

### Requirement: Category Spending and Outlier Analysis
The agent SHALL support analytical queries regarding category breakdowns, identifying top expense categories, and evaluating budget pacing.

#### Scenario: Top Spending Categories Query
- **WHEN** user asks "kategori apa yang paling boros bulan ini?" or "alokasi pengeluaran terbesar saya apa saja?"
- **THEN** the agent inspects the category breakdown from `get_snapshot` or queries filtered transactions
- **THEN** the agent ranks and formats top expense categories with their respective percentage allocations and monetary values
