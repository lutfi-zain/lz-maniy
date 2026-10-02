# Spec Delta

## ADDED Requirements

### Requirement: Full Reedrich REST API Tool Coverage

The agent service SHALL expose AI SDK tools mapping to the complete Reedrich REST API v1.17.0 surface, including: wallet CRUD (`GET/POST/PATCH/DELETE /api/v1/wallets`), category CRUD (`POST/PATCH/DELETE /api/v1/categories`), budget CRUD (`GET/POST/PATCH/DELETE /api/v1/budgets`), debt/loan management (`GET/POST/PATCH/DELETE /api/v1/debts-loans`, `POST /api/v1/debts-loans/:id/repay`), goal management (`GET/POST/PATCH/DELETE /api/v1/goals`, `POST/DELETE /api/v1/goals/:id/wallets`), recurring template management (`GET/POST/PATCH/DELETE /api/v1/recurring-templates`, `POST /api/v1/recurring-templates/:id/apply`), financial summary (`GET /api/v1/summary`), horizon projections (`GET /api/v1/analytics/horizon`), feedback submission (`POST /api/v1/feedback`), and user profile update (`PATCH /api/v1/me`).

#### Scenario: Agent creates a new wallet

- **WHEN** the user asks to create a new wallet (e.g. "buat dompet Cash Rumah di Bank Jago")
- **THEN** the agent calls `POST /api/v1/wallets` with name, institution, type, balance, and currency, and reports the created wallet back to the user

#### Scenario: Agent manages a debt/loan

- **WHEN** the user reports a debt or loan (e.g. "saya hutang 500k ke Abi")
- **THEN** the agent calls `POST /api/v1/debts-loans` with personName, amount, type, and optional walletId/dueDate, and confirms the recorded obligation

#### Scenario: Agent records a loan repayment

- **WHEN** the user reports a repayment (e.g. "Abi bayar hutang 500k")
- **THEN** the agent calls `POST /api/v1/debts-loans/:id/repay` with amount and walletId, and reports the updated remaining balance

#### Scenario: Agent manages a goal

- **WHEN** the user asks to create or check a savings goal (e.g. "bikin goal sewa rumah 18jt")
- **THEN** the agent calls the appropriate goals endpoint and reports the goal status including pacing data (progressPercentage, remainingAmount, requiredMonthlySavings)

#### Scenario: Agent manages a recurring template

- **WHEN** the user asks to set up or realize a recurring transaction (e.g. "bikin recurring cicilan motor 1.3jt tiap bulan")
- **THEN** the agent calls `POST /api/v1/recurring-templates` with name, walletId, amount, frequency, startDate, and reports the template back to the user

#### Scenario: Agent retrieves financial summary with safe-to-spend

- **WHEN** the user asks for a spending safety check (e.g. "boleh spend berapa lagi hari ini?")
- **THEN** the agent calls `GET /api/v1/summary` and reports `safeToSpend`, `dailySafeToSpend`, and the deduction details (planned expenses, recurring expenses, active debts)

#### Scenario: Agent retrieves horizon projection

- **WHEN** the user asks for multi-period planning (e.g. "proyeksi net worth sampai April")
- **THEN** the agent calls `GET /api/v1/analytics/horizon` with appropriate months/periods parameter and presents the roll-forward projection in a table

#### Scenario: Agent creates a budget

- **WHEN** the user asks to set a spending limit (e.g. "bikin budget jenguk mertua 1.5jt")
- **THEN** the agent calls `POST /api/v1/budgets` with name, amount, periodStart, periodEnd, and optional categoryId, and confirms the created budget with its utilization status

### Requirement: Gemini Native Runner Tool Parity

The agent service SHALL register every tool available in the AI SDK tool set (financial, mutation, and UI command tools) in the Gemini native runner's `toolDeclarations` and `executeTool` switch, ensuring zero functional gap between the Gemini and Groq/AI-SDK code paths.

#### Scenario: Gemini model calls a tool available only in AI SDK path

- **WHEN** a user selects a Gemini model and asks to open a wallet detail drawer
- **THEN** the Gemini native runner recognizes `open_drawer` in its tool declarations, executes it, and returns the UI command result

#### Scenario: All tools produce identical results across providers

- **WHEN** the same tool call with identical arguments is executed through the AI SDK path and the Gemini native runner
- **THEN** both paths return the same structured result

### Requirement: Curiosity-First System Prompt

The agent service SHALL use a system prompt that instructs the model to follow a data-first retrieval pattern: always call at least one financial tool before answering any financial question, verify mutations by calling `get_snapshot` or `financial_summary` after recording transactions, cross-reference planned transactions with actual data when answering planning queries, and proactively surface insights (budget utilization, spending trend, safe-to-spend) from retrieved data.

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

### Requirement: Confirmation Gate for Mutations

The agent service system prompt SHALL instruct the model to display a draft summary (entity, amount, wallet, category) and request explicit user confirmation before executing any create, update, or delete operation on financial data.

#### Scenario: User asks to record a transaction

- **WHEN** the user says "catat beli KFC 93k dari jago main"
- **THEN** the agent displays the draft (walletId resolution, categoryId resolution, amount, type, date) and asks for confirmation before calling `POST /api/v1/transactions`

#### Scenario: User asks to delete a transaction

- **WHEN** the user asks to delete a transaction
- **THEN** the agent shows the transaction details and asks for explicit confirmation before calling `DELETE /api/v1/transactions/:id`

### Requirement: Model Lineup Cleanup

The agent service SHALL expose only proven, non-redundant models in `AVAILABLE_MODELS`: `gemini-3.1-flash-lite`, `gemini-3.7-flash`, `gemini-3.8-flash`, `gemini-3.1-pro-preview`, `groq/openai/gpt-oss-20b`, and `groq/openai/gpt-oss-120b`. Superseded models (`gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-3.6-flash`, `gemini-flash-lite-latest`) and niche models (`groq/qwen/qwen3.8-27b`) SHALL be removed.

#### Scenario: Frontend fetches available models

- **WHEN** the frontend calls `GET /api/models`
- **THEN** the response contains exactly 6 models with no superseded or niche entries

### Requirement: Error Protocol in System Prompt

The agent service system prompt SHALL instruct the model to handle tool errors by reading the error message, retrying once with corrected arguments for transient or argument errors, and reporting the failure to the user without inventing data if the error persists.

#### Scenario: Tool call fails with transient error

- **WHEN** a Reedrich API call returns 503 or UNAVAILABLE
- **THEN** the agent retries once, and if the retry fails, informs the user about the temporary unavailability

#### Scenario: Tool call fails with validation error

- **WHEN** a Reedrich API call returns 400 with a field-level validation message
- **THEN** the agent reads the error message, corrects the argument, and retries once
