## MODIFIED Requirements

### Requirement: Curiosity-First System Prompt

The agent service SHALL use a context-engineered system prompt instructing the model to follow a data-first retrieval pattern: always call at least one financial tool before answering financial inquiries, verify mutations by calling `get_snapshot` or `list_wallets` after recording transactions, route multi-period forecasting and milestone attainment inquiries directly to `horizon_projection` without manual LLM arithmetic, and proactively surface actionable insights (budget utilization, spending trajectory, safe-to-spend).

#### Scenario: User asks a financial question

- **WHEN** the user asks "saldo saya berapa?"
- **THEN** the agent calls `get_snapshot` or `financial_summary` BEFORE generating any text answer, and bases its response on the retrieved data

#### Scenario: Agent records a transaction and verifies

- **WHEN** the agent records one or more transactions via tool calls
- **THEN** the agent subsequently calls a snapshot or summary tool and reports the updated wallet balance and relevant budget utilization to the user

#### Scenario: User asks about planning projections

- **WHEN** the user asks "planning bulan depan gimana?"
- **THEN** the agent calls at minimum `get_snapshot` AND `list_transactions` (with planned filter) before synthesizing a projection, and presents the calculation transparently

#### Scenario: Agent surfaces proactive insight

- **WHEN** the agent retrieves financial data that reveals a notable condition (e.g. budget over 80% utilized, safe-to-spend below Rp 500,000, goal behind pace)
- **THEN** the agent proactively mentions the condition and offers actionable suggestions, without the user having to ask

## ADDED Requirements

### Requirement: Context-Engineered Intent Routing & Horizon Invariant

The agent system prompt SHALL incorporate a structured Intent-to-Tool Decision Matrix categorizing tools across temporal horizons (T=0 Current, T<0 Historical, T+1 Month Micro-Plan, and T>1 to 24 Months Macro Horizon), mandate invocation of `horizon_projection` for all multi-period trajectory and milestone inquiries, and omit redundant plain-text tool listings from the prompt body to conserve LLM attention budget.

#### Scenario: User asks about multi-month trajectory or savings milestone

- **WHEN** the user asks a multi-period forecasting question (e.g., "apakah kita bisa beli laptop Desember?", "bagaimana tren runway kas 6 bulan ke depan?", or "kapan target DP rumah tembus?")
- **THEN** the agent SHALL invoke `horizon_projection` with `months` matching the requested horizon (defaulting to 6 months)
- **AND** the agent SHALL NOT attempt to calculate multi-month balance accumulation manually via repeated `list_transactions` calls
- **AND** the agent SHALL format the projected trajectory into a structured Markdown table displaying month, income, expense, net spendable cash, spendable net worth, and reached milestone goals.

#### Scenario: System prompt attention budget conservation

- **WHEN** the agent constructs the dynamic system prompt via `buildSystemPrompt`
- **THEN** the system prompt SHALL NOT contain redundant prose catalogs enumerating tools already declared in the model's function declarations
- **AND** the total character size of the system prompt (excluding user memory and page context) SHALL not exceed 6,000 characters (~1,200 tokens).

#### Scenario: Discriminative tool description prevents single-transaction misuse

- **WHEN** the agent tool declarations are compiled for LLM consumption
- **THEN** the `horizon_projection` tool description SHALL explicitly specify that it is intended for forward multi-period roll-forward simulations and savings milestone tracking, and SHALL NOT be called for single-transaction lookups.
