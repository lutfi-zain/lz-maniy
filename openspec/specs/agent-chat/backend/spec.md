# agent-chat/backend Specification

## Purpose
Cloudflare Worker backend service providing real-time streaming AI chat powered by Vercel AI SDK, executing financial data tools against the Reedrich REST API and UI command tools for frontend orchestration, authenticated via Reedrich OAuth token passthrough and backed by Cloudflare D1 and KV.

## Requirements

### Requirement: Streaming Chat Endpoint
The agent service SHALL expose a `POST /api/chat` endpoint implementing Server-Sent Events (SSE) data stream protocol using Vercel AI SDK `streamText`.

#### Scenario: Successful Chat Request with Streaming Response
- **WHEN** client sends `POST /api/chat` with valid `Authorization: Bearer <reedrich_access_token>`, conversation ID, messages array, selected model, and optional page context
- **THEN** the server validates the auth token, constructs the system prompt with page context, and streams text tokens and tool execution events using SSE `text-event-stream` protocol
- **THEN** the HTTP status code is 200 and headers include `Content-Type: text/event-stream; charset=utf-8`

#### Scenario: Streaming LLM Failure Recovery
- **WHEN** the upstream model provider returns an error mid-stream (e.g. rate limit, content filter, or timeout)
- **THEN** the server catches the failure, emits an error event payload over the stream, and closes the stream gracefully without unhandled worker crashes

#### Scenario: Concurrent Requests from Same User
- **WHEN** a user dispatches a second `POST /api/chat` request while an existing stream for the same or different conversation is actively processing
- **THEN** the server processes both requests independently without state pollution or race conditions, isolated by request context and D1 row transactions

### Requirement: Authentication via Reedrich Token Passthrough
The agent service SHALL authenticate incoming requests by validating the provided Reedrich OAuth bearer token directly against Reedrich's `GET /api/v1/me` endpoint.

#### Scenario: Valid Bearer Token
- **WHEN** client requests an authenticated endpoint (`/api/chat`, `/api/conversations/*`) with a valid Reedrich JWT bearer token
- **THEN** the service validates the token via `GET /api/v1/me` (or cached token session in KV), extracts `userId`, and associates all database records with this `userId`

#### Scenario: Expired or Invalid Bearer Token
- **WHEN** client sends a request with an expired, malformed, or missing bearer token
- **THEN** the service returns HTTP 401 Unauthorized with `{ error: 'unauthorized', message: 'Invalid or expired Reedrich session' }`

### Requirement: Multi-Provider Model Selection
The agent service SHALL support model selection between Google Gemini, Groq, and OpenCode providers using system-managed environment API keys or default public tokens.

#### Scenario: Provider and Model Routing
- **WHEN** client requests a Gemini model (e.g. `gemini-3.1-flash-lite`, `gemini-3.6-flash`) or a Groq model (e.g. `openai/gpt-oss-20b`)
- **THEN** the service instantiates the corresponding Vercel AI SDK provider with the updated valid `GEMINI_API_KEY` or `GROQ_API_KEY` from worker environment bindings
- **THEN** requests route to the designated provider without requiring client-supplied API keys

#### Scenario: Public Model Listing
- **WHEN** an unauthenticated client sends `GET /api/models`
- **THEN** the server returns HTTP 200 with the list of supported models, their display names, providers, and capabilities (`vision`, `tool_calling`) without requiring an Authorization header
- **THEN** non-functional OpenCode models are excluded from the active listing

#### Scenario: OpenCode Provider Routing with Public Token
- **WHEN** client requests a legacy conversation or payload specifying provider `opencode`
- **THEN** the service safely falls back to the default Gemini model (`gemini-3.1-flash-lite`) instead of triggering upstream 500 or 403 network crashes

#### Scenario: Gemini High-Demand Error Handling
- **WHEN** an upstream Gemini request returns HTTP 503 due to temporary high demand spikes (e.g. on `gemini-3.7-flash` or `gemini-3.8-flash`)
- **THEN** the runner catches the error and surfaces a descriptive stream message recommending fallback to `gemini-3.1-flash-lite` or retry

### Requirement: Multi-Step Tool Calling Agent Loop
The agent service SHALL execute an agent loop with `maxSteps` (up to 10 steps) allowing the model to invoke multiple tools sequentially without premature termination when intermediate text or reasoning is emitted.

#### Scenario: Tool Invocation Sequence
- **WHEN** a user prompt requires retrieving account data before answering (e.g. "Berapa sisa budget makan bulan ini?")
- **THEN** the model emits a tool call for `get_snapshot`, the server executes the tool against Reedrich API, returns the tool result to the model, and the model synthesizes the answer within `maxSteps`

#### Scenario: Tool Execution Failure Propagation
- **WHEN** a tool execution fails (e.g. Reedrich API returns 500 or 404 for a transaction ID)
- **THEN** the tool returns a structured error object `{ error: string, code: number }` as its tool result
- **THEN** the agent loop feeds the error back to the model so it can explain the problem gracefully to the user instead of aborting the request

#### Scenario: Continuous Stream Across Multiple Tool Invocations
- **WHEN** the model produces preliminary thought or explanation text in an intermediate turn and simultaneously emits function calls
- **THEN** the streaming generator yields the preliminary text tokens and proceeds to execute the requested tools without closing the stream
- **THEN** the generator feeds tool results back to the model for subsequent analysis or final synthesis until no further tool calls remain

#### Scenario: Prior Conversation History Injection
- **WHEN** client sends a message in an existing conversation
- **THEN** the service retrieves prior conversation turns (`priorMessages`) and provides them to the model runner
- **THEN** the model answers with full awareness of previous user prompts and assistant outputs in the session

### Requirement: Financial Data Tools
The agent service SHALL provide AI SDK tools mapping to Reedrich REST API endpoints using the user's forwarded bearer token.

#### Scenario: Tool get_snapshot
- **WHEN** the model invokes `get_snapshot`
- **THEN** the service calls `GET /api/v1/account-detail` on Reedrich and returns `AccountDetail` (netWorth, wallets, monthlyCashFlow, budgets, goals, obligations)

#### Scenario: Tool list_transactions
- **WHEN** the model invokes `list_transactions` with optional `walletId`, `categoryId`, `budgetId`, `limit`, `offset`
- **THEN** the service calls `GET /api/v1/transactions` with query parameters and returns `TransactionRecord[]`

#### Scenario: Tool create_transaction
- **WHEN** the model invokes `create_transaction` with wallet, category, amount, transactionType, and optional details
- **THEN** the service executes `POST /api/v1/transactions` on Reedrich and returns the created `TransactionRecord`

#### Scenario: Tool create_transfer
- **WHEN** the model invokes `create_transfer` with sourceWalletId, targetWalletId, and amount
- **THEN** the service executes `POST /api/v1/transfers` on Reedrich and returns the transfer `TransactionRecord`

#### Scenario: Tool update_transaction
- **WHEN** the model invokes `update_transaction` with transactionId and patch payload
- **THEN** the service executes `PATCH /api/v1/transactions/:id` on Reedrich and returns the updated `TransactionRecord`

#### Scenario: Tool delete_transaction
- **WHEN** the model invokes `delete_transaction` with transactionId
- **THEN** the service executes `DELETE /api/v1/transactions/:id` on Reedrich and returns `{ success: true }`

#### Scenario: Tool get_categories
- **WHEN** the model invokes `get_categories`
- **THEN** the service calls `GET /api/v1/categories` on Reedrich and returns `CategoryRecord[]`

#### Scenario: Tool get_user_profile
- **WHEN** the model invokes `get_user_profile`
- **THEN** the service calls `GET /api/v1/me` on Reedrich and returns `UserProfileDTO`

### Requirement: UI Command Tools
The agent service SHALL expose frontend navigation and orchestration tools that return a structured `{ type: 'ui_command', command: string, payload: any }` tool result for browser execution.

#### Scenario: Tool navigate_page
- **WHEN** the model calls `navigate_page` with target route (e.g. `/`, `/planning`, `/profile`)
- **THEN** the tool returns `{ type: 'ui_command', command: 'navigate', payload: { route } }`

#### Scenario: Tool change_filter
- **WHEN** the model calls `change_filter` with institution or wallet filter
- **THEN** the tool returns `{ type: 'ui_command', command: 'filter', payload: { institution, walletId } }`

#### Scenario: Tool change_tab
- **WHEN** the model calls `change_tab` with target tab identifier (e.g. `budgets`, `goals`, `obligations`)
- **THEN** the tool returns `{ type: 'ui_command', command: 'tab', payload: { tab } }`

#### Scenario: Tool change_date_range
- **WHEN** the model calls `change_date_range` with start and end ISO dates
- **THEN** the tool returns `{ type: 'ui_command', command: 'date_range', payload: { start, end } }`

#### Scenario: Tool open_drawer
- **WHEN** the model calls `open_drawer` with drawer type (`wallet`, `category`, `budget`, `goal`, `obligation`, `networth`) and item data
- **THEN** the tool returns `{ type: 'ui_command', command: 'drawer', payload: { drawerState } }`

#### Scenario: Tool open_transaction_form
- **WHEN** the model calls `open_transaction_form` with prefilled transaction mode and values
- **THEN** the tool returns `{ type: 'ui_command', command: 'transaction_form', payload: { mode, formData } }`

#### Scenario: Tool focus_element
- **WHEN** the model calls `focus_element` with CSS selector or element ID
- **THEN** the tool returns `{ type: 'ui_command', command: 'focus', payload: { selector } }`

### Requirement: Conversation Persistence in Cloudflare D1
The agent service SHALL persist conversations and message histories in Cloudflare D1 partitioned strictly by `userId`.

#### Scenario: Conversation List Query
- **WHEN** client sends `GET /api/conversations` with valid auth token
- **THEN** the server returns HTTP 200 with an array of `ConversationMeta` belonging exclusively to that `userId`, ordered by `updated_at DESC`

#### Scenario: Empty Conversation List
- **WHEN** a user has created no conversations yet and calls `GET /api/conversations`
- **THEN** the server returns HTTP 200 with an empty array `[]` (not 404 or null)

#### Scenario: Conversation Retrieval
- **WHEN** client sends `GET /api/conversations/:id` with valid auth token
- **THEN** the server returns HTTP 200 with the conversation record and all associated `ChatMessage[]` ordered chronologically if owned by `userId`, or 404 if not found/unauthorized

#### Scenario: Conversation Deletion
- **WHEN** client sends `DELETE /api/conversations/:id` with valid auth token
- **THEN** the server deletes the conversation and cascades deletion to all associated messages in D1, returning HTTP 200 `{ success: true }`

### Requirement: Export and Import of Conversations
The agent service SHALL support exporting and importing conversation histories in JSON format.

#### Scenario: Export Conversations
- **WHEN** client sends `POST /api/conversations/export` with optional array of conversation IDs
- **THEN** the server extracts the requested conversations (or all conversations for the user if omitted) along with complete message history, and returns a JSON export bundle

#### Scenario: Import Conversations
- **WHEN** client sends `POST /api/conversations/import` with a valid JSON bundle of conversations and messages
- **THEN** the server validates the schema, assigns new UUIDs to avoid collision, links them to the authenticated `userId`, persists them to D1, and returns the imported metadata summary

### Requirement: Page Context and System Prompt Construction
The agent service SHALL inject client-provided page context into the dynamic system prompt to maintain UI awareness.

#### Scenario: System Prompt with Page Context
- **WHEN** client submits a chat message containing `pageContext` (route, active tab, selected filters, date range, drawer status)
- **THEN** the server prepends a dynamic system instruction block detailing the financial assistant persona, current date, active view route, and visible financial entities
- **THEN** the assistant generates context-aware answers without needing to ask the user what screen they are currently viewing

### Requirement: Image Handling and Ephemeral Processing
The agent service SHALL support multimodal image input while ensuring raw image binaries/base64 data are never stored in D1 database records.

#### Scenario: Inbound Image Attachment to Vision Model
- **WHEN** client submits a user message containing a base64-encoded image or data URL to a vision-capable model
- **THEN** the service formats the image as an image content part for the Vercel AI SDK model call
- **THEN** when persisting the message to D1, the service replaces base64 image data with an ephemeral reference `{ imageRef: string }` or omits binary data, ensuring D1 row size limits are never violated

### Requirement: Configurable Thinking Level Execution
The agent service SHALL accept and apply thinking level configurations to supported reasoning models.

#### Scenario: Gemini Thinking Config Propagation
- **WHEN** client submits a request with `thinkingLevel` (`off`, `minimal`, `low`, `medium`, `high`)
- **THEN** the native Gemini runner maps the level to `thinkingConfig` (`thinkingBudget: 0` for `off`, or appropriate token budgets / levels for `minimal`/`low`/`medium`/`high`)
- **THEN** the model output streams smoothly without failing render or dropping tool execution

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

### Requirement: OMP Gateway Provider Routing

The agent service SHALL support model selection and execution via the OMP Auth Gateway (`https://ai.membran.app/v1` or configured `OMP_GATEWAY_URL`) using `@ai-sdk/openai`, authenticating upstream requests with the bearer token from `OMP_GATEWAY_KEY`.

#### Scenario: Request routed to OMP Gateway
- **WHEN** client sends `POST /api/chat` with an OMP-hosted model (e.g. `google-antigravity/gemini-3.7-flash` or `opencode-zen/muse-spark-1.3-contributor-free`)
- **THEN** the service instantiates the OpenAI-compatible client configured with the OMP gateway baseURL and apiKey, and streams text tokens, tool execution events, and thought deltas using SSE data stream protocol

#### Scenario: Missing Gateway Configuration Graceful Degradation
- **WHEN** `OMP_GATEWAY_KEY` is not configured in the worker environment bindings
- **THEN** the server returns an HTTP 500 JSON error indicating gateway credentials are not configured, without crashing worker runtime

### Requirement: Curated OMP Gateway Model Lineup

The agent service SHALL restrict available models in `AVAILABLE_MODELS` exclusively to Google Antigravity Gemini (`google-antigravity/gemini-3.1-flash-lite`, `google-antigravity/gemini-3.7-flash`, `google-antigravity/gemini-3.8-flash`) and OpenCode Spark 1.3 Free (`opencode-zen/muse-spark-1.3-contributor-free`). Direct Groq and legacy unproxied models SHALL be removed from active listing.

#### Scenario: Public Model Listing via GET /api/models
- **WHEN** client sends `GET /api/models`
- **THEN** the response returns exactly 4 models: 3 Google Antigravity Gemini variants and 1 OpenCode Spark 1.3 Free variant, each flagged with their respective capabilities (`vision`, `tool_calling`, `thinking`)

### Requirement: Gateway Reasoning and Thinking Level Mapping

The agent service SHALL map client-requested `thinkingLevel` (`off`, `minimal`, `low`, `medium`, `high`) to `reasoningEffort` or OpenAI provider options when invoking reasoning models through the OMP gateway.

#### Scenario: Thinking Level Propagation to OMP Gateway
- **WHEN** client submits a request with `thinkingLevel: 'high'` for `google-antigravity/gemini-3.7-flash`
- **THEN** the request to OMP gateway includes `reasoning_effort: 'high'`, prompting the upstream model to emit reasoning tokens before synthesis
