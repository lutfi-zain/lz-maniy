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

#### Scenario: Expanded Gemini Model List
- **WHEN** `AVAILABLE_MODELS` is evaluated
- **THEN** it contains all 12 google-antigravity Gemini models: `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-2.5-pro`, `gemini-3-flash`, `gemini-3-pro`, `gemini-3.1-flash-lite`, `gemini-3.1-pro`, `gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-3.6-flash`, `gemini-3.7-flash`, `gemini-3.8-flash`
- **THEN** each model entry specifies `provider: 'omp'`, the full `google-antigravity/<model>` model ID, a human-readable `displayName`, and accurate `capabilities` (vision, tool_calling, thinking)

#### Scenario: Thinking Level Configuration per Model
- **WHEN** a model supports thinking (all 12 do)
- **THEN** its `thinkingLevels` array reflects the actual levels supported by the OMP gateway for that model (e.g. `['off', 'minimal', 'low', 'medium', 'high']` for flash models, `['off', 'low', 'high']` for pro models)

#### Scenario: Default Model Unchanged
- **WHEN** no model is specified in the chat request
- **THEN** the service defaults to `google-antigravity/gemini-3.7-flash`

#### Scenario: OpenCode Provider Routing with Public Token
- **WHEN** client requests a legacy conversation or payload specifying provider `opencode`
- **THEN** the service safely falls back to the default Gemini model (`gemini-3.7-flash`) instead of triggering upstream 500 or 403 network crashes

#### Scenario: Gemini High-Demand Error Handling
- **WHEN** an upstream Gemini request returns HTTP 503 due to temporary high demand spikes (e.g. on `gemini-3.7-flash` or `gemini-3.8-flash`)
- **THEN** the runner catches the error and surfaces a descriptive stream message recommending fallback to `gemini-3.1-flash-lite` or retry

### Requirement: Gemini Native Runner Actual Token Usage
The Gemini native runner SHALL use actual token counts from the Gemini API `usageMetadata` instead of hardcoded placeholder values.

#### Scenario: Real Token Counts in Stream Metadata
- **WHEN** the Gemini native runner completes a response (with or without tool calls)
- **THEN** the `e:` and `d:` SSE events contain `promptTokens` and `completionTokens` derived from `response.usageMetadata.promptTokenCount` and `response.usageMetadata.candidatesTokenCount`
- **THEN** if `usageMetadata` is unavailable, the runner falls back to estimation (word-count * 1.3) rather than hardcoded 100/100

#### Scenario: Token Counts Accumulate Across Tool Loops
- **WHEN** the Gemini runner executes multiple tool-call loops before producing a final text response
- **THEN** the reported token counts reflect the cumulative usage across all loops, not just the final response

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
The agent service SHALL restrict available models in `AVAILABLE_MODELS` exclusively to verified, functioning Google Antigravity Gemini models supported by the upstream OMP AI Gateway.

#### Scenario: Verified Gateway Model Listing
- **WHEN** `AVAILABLE_MODELS` is evaluated or queried via `GET /api/models`
- **THEN** it contains only verified models:
  - `google-antigravity/gemini-3.8-flash`
  - `google-antigravity/gemini-3.5-flash-lite`
  - `google-antigravity/gemini-3.1-flash-lite`
  - `google-antigravity/gemini-2.5-flash`
  - `google-antigravity/gemini-2.5-flash-lite`
- **THEN** unverified or removed models (`gemini-3.7-flash`, `gemini-2.5-pro`, `gemini-3.1-pro`, `gemini-3.6-flash`) are not present in `AVAILABLE_MODELS`

#### Scenario: Upstream Gateway Unknown Model Fallback
- **WHEN** a chat request specifies a model that is rejected by the upstream gateway with an unknown model error
- **THEN** the agent service falls back to `google-antigravity/gemini-3.8-flash` or emits a descriptive SSE error event instead of a masked `3:"An error occurred."`

### Requirement: Gateway Reasoning and Thinking Level Mapping

The agent service SHALL map client-requested `thinkingLevel` (`off`, `minimal`, `low`, `medium`, `high`) to `reasoningEffort` or OpenAI provider options when invoking reasoning models through the OMP gateway.

#### Scenario: Thinking Level Propagation to OMP Gateway
- **WHEN** client submits a request with `thinkingLevel: 'high'` for `google-antigravity/gemini-3.7-flash`
- **THEN** the request to OMP gateway includes `reasoning_effort: 'high'`, prompting the upstream model to emit reasoning tokens before synthesis

### Requirement: Multimodal Image Injection
The agent service SHALL inject client-provided image data into the model call as a content part, enabling vision-capable models to analyze attached images.

#### Scenario: Gemini Native Image Injection
- **WHEN** `body.image` is present and the selected model uses the Gemini native runner
- **THEN** the runner constructs the user message as multipart content: `[{ text: userMessage }, { inlineData: { data: base64Data, mimeType: imageMimeType } }]`
- **THEN** the model receives and processes the image alongside the text prompt

#### Scenario: AI SDK Path Image Injection
- **WHEN** `body.image` is present and the selected model uses the AI SDK `streamText` path
- **THEN** the user message content array includes `{ type: 'image', image: base64Data, mimeType: imageMimeType }` alongside the text part
- **THEN** the model receives the image for analysis

#### Scenario: Vision Fallback to Groq
- **WHEN** `body.image` is present and the selected model does not have `capabilities.vision === true`
- **THEN** the service transparently routes the request to Groq `qwen/qwen3.8-27b` using the `GROQ_API_KEY` environment binding
- **THEN** the image is passed as a `data:` URI in `image_url` format per Groq's vision API
- **THEN** the response streams back to the client identically to any other model response

### Requirement: Thinking Text Streaming
The agent service SHALL stream model thinking/reasoning text to the client via a dedicated SSE prefix, separate from the final answer text.

#### Scenario: Gemini Native Thinking Stream
- **WHEN** the Gemini native runner processes a response with thinking enabled (`thinkingLevel` is not `off`)
- **THEN** response parts where `part.thought === true` are streamed with SSE prefix `g:` (thinking delta)
- **THEN** response parts where `part.thought` is falsy are streamed with the existing SSE prefix `0:` (text delta)
- **THEN** thinking parts precede answer parts in the stream chronologically

#### Scenario: Thinking Summaries Configuration
- **WHEN** the Gemini native runner creates a chat session with thinking enabled
- **THEN** the config includes `thinking_summaries: 'auto'` so thought summary text is available in streaming parts

#### Scenario: OMP Gateway Thinking Text
- **WHEN** a model routed through the OMP gateway produces reasoning output
- **THEN** if the AI SDK response includes a `reasoning` field or reasoning content in provider metadata, the service streams it via SSE prefix `g:`
- **THEN** if no reasoning content is available from the gateway, only the standard `0:` text delta is emitted (no error)

### Requirement: OpenCode Model Removal and Default Change
The agent service SHALL remove non-functional models and update defaults to a reliable baseline.

#### Scenario: OpenCode Model Exclusion
- **WHEN** `AVAILABLE_MODELS` is evaluated
- **THEN** no model with provider `opencode` or model ID `opencode-zen/muse-spark-1.3-contributor-free` is present in the list

#### Scenario: Default Model Selection
- **WHEN** a chat request arrives without an explicit model selection or with an unrecognized model
- **THEN** the service defaults to `google-antigravity/gemini-3.8-flash` with provider `omp`

#### Scenario: Legacy OpenCode Conversation Fallback
- **WHEN** a resumed conversation references provider `opencode` or the removed model
- **THEN** the service silently falls back to the default model without returning an error

### Requirement: Conversation Compaction
The agent service SHALL automatically compact conversation history when the estimated token count approaches the model's context window limit.

#### Scenario: Compaction Trigger
- **WHEN** the estimated token count of the full conversation history exceeds 80% of the active model's context window (e.g., 80% of 1M tokens for Gemini Flash models)
- **THEN** the service selects the oldest N messages (excluding the system prompt and last 4 user/assistant turns) and summarizes them into a single concise context paragraph via a lightweight model call

#### Scenario: Compacted History Structure
- **WHEN** compaction produces a summary
- **THEN** the summarized text is prepended to the conversation as a synthetic `system` message with role marker `[Conversation Summary]`
- **THEN** the original compacted messages are retained in D1 but excluded from the model context on subsequent requests
- **THEN** a `compacted_at` timestamp is stored on the conversation record

#### Scenario: Token Estimation
- **WHEN** the service estimates token count before a chat request
- **THEN** it uses word count × 1.3 as a rough token estimate for text messages, plus 2048 per image reference in history

### Requirement: Context Usage Reporting
The agent service SHALL report context window utilization in stream metadata.

#### Scenario: Context Usage in Stream Finish
- **WHEN** a streaming response completes
- **THEN** the stream finish metadata (`d:` SSE event) includes `contextUsage: { usedTokens: number, maxTokens: number, percentUsed: number }`
- **THEN** `maxTokens` reflects the active model's context window size
- **THEN** `usedTokens` is the actual prompt token count from the model's usage report (or the estimate if actual is unavailable)

### Requirement: Credit Integration in Chat Flow
The agent service SHALL enforce credit balance checks and record deductions as part of the chat request lifecycle.

#### Scenario: Pre-Request Credit Check
- **WHEN** an authenticated `POST /api/chat` request arrives
- **THEN** the service checks the user's credit balance before making any model call
- **THEN** if balance is 0 or negative, the request is rejected with HTTP 402 before any token is consumed

#### Scenario: Post-Stream Credit Settlement
- **WHEN** a chat stream completes (via `onFinish` callback or `waitUntil`)
- **THEN** the service calculates actual credit cost from reported token usage, deducts from balance, and records the transaction
- **THEN** the credit info is included in the stream finish metadata sent to the client

### Requirement: Full Precision Timestamp and Mutation Parameter Alignment
The agent service SHALL support ISO-8601 date-time timestamps (with hours, minutes, seconds, and timezone) and complete mutation payloads across all transaction and transfer tools matching the Reedrich REST API.

#### Scenario: Agent updates transaction date and time
- **WHEN** user requests changing the time of a transaction (e.g. "ubah jam transaksi makan siang tadi jadi 13:45")
- **THEN** the agent calls `update_transaction` with `date` formatted as an ISO-8601 string containing the specified hour, minute, and WIB timezone offset (`YYYY-MM-DDTHH:mm:ss+07:00`)
- **THEN** the mutation passes validation and updates the transaction in Reedrich without rejection

#### Scenario: Agent assigns transaction to a budget
- **WHEN** user asks to update or create a transaction tied to a specific budget (e.g. "alokasikan transaksi ini ke budget Liburan")
- **THEN** `update_transaction` and `create_transaction` accept `budgetId` and pass it to the Reedrich API payload

#### Scenario: Agent records categorized transfer with admin fee
- **WHEN** user requests transferring money with an admin fee and category (e.g. "transfer 500k dari BCA ke Jago, kena biaya admin 2500 kategori Biaya Transfer")
- **THEN** `create_transfer` accepts `sourceWalletId`, `targetWalletId`, `amount`, `adminFee`, `categoryId`, and `date` (ISO-8601) and forwards all fields to `POST /api/v1/transfers`

### Requirement: Comprehensive Transaction Query and Full-Fidelity Output Mapping
The agent service SHALL expose complete search and filter parameters on `list_transactions` and return transaction records with full-fidelity fields including `transactionId`, full `transactionDate`, and relation IDs.

#### Scenario: Agent queries transactions by keyword or status
- **WHEN** user asks for specific transactions by search term (e.g. "cari transaksi Kopi Kenangan") or status (e.g. "daftar transaksi rencana bulan ini")
- **THEN** `list_transactions` accepts `q` (or `search`), `type`, `isPlanned`, `budgetId`, `targetWalletId`, and `orderBy` in addition to date and wallet filters
- **THEN** the request parameters map directly to query parameters for `GET /api/v1/transactions`

#### Scenario: Agent receives transaction ID and timestamp in query output
- **WHEN** `list_transactions` returns matching records to the model
- **THEN** each mapped item contains `id` (matching `transactionId`), `date` (full ISO string from `transactionDate`), `amount`, `walletId`, `targetWalletId`, `categoryId`, `budgetId`, `type`, `isPlanned`, and `desc`
- **THEN** the model can reference the transaction by its exact `id` for subsequent updates or deletions without guessing

### Requirement: Recurring Template Application Overrides
The agent service SHALL support occurrence overrides when realizing recurring template transactions via `apply_recurring`.

#### Scenario: Agent applies recurring template with amount override
- **WHEN** user confirms realizing a recurring obligation with an adjusted amount (e.g. "realisasikan tagihan listrik PLN, bulan ini nominalnya 485.000")
- **THEN** `apply_recurring` accepts optional `transactionId`, `executionDate` (ISO-8601), and `actualAmount`
- **THEN** the agent sends `POST /api/v1/recurring-templates/{templateId}/apply` with the override payload

### Requirement: Single Entity Drilldown Tools (Get by ID)
The agent service SHALL expose dedicated tools for inspecting single financial entities by their unique identifier without requiring full list scanning.

#### Scenario: Agent retrieves single transaction by ID
- **WHEN** the agent needs to inspect or verify a specific transaction after mutation or error
- **THEN** the agent calls `get_transaction` with `transactionId`
- **THEN** the service calls `GET /api/v1/transactions/{transactionId}` and returns the complete transaction entity

#### Scenario: Agent retrieves single wallet, budget, goal, or recurring template by ID
- **WHEN** the agent needs details for a single wallet, budget, goal, or recurring template by its identifier
- **THEN** the agent can invoke `get_wallet`, `get_budget`, `get_goal`, or `get_recurring`
- **THEN** the service fetches the entity via the respective `GET /api/v1/{resource}/{id}` endpoint

### Requirement: User Settings REST Endpoints
The agent backend SHALL expose authenticated endpoints for reading and writing user-level settings to D1.

#### Scenario: Settings Route Registration
- **WHEN** the Hono app initializes
- **THEN** `GET /api/settings` and `PUT /api/settings` are registered under the settings router with `authMiddleware` applied

#### Scenario: GET Returns Stored or Default Settings
- **WHEN** authenticated client sends `GET /api/settings`
- **THEN** the backend queries `user_settings` by `userId` and returns the stored JSON, or `{ ledgerViewMode: "single", activePeriods: [] }` if no record exists

#### Scenario: PUT Upserts Settings
- **WHEN** authenticated client sends `PUT /api/settings` with a JSON body
- **THEN** the backend validates the payload, merges with existing settings (if any), and executes `INSERT ... ON CONFLICT(user_id) DO UPDATE` against `user_settings`

### Requirement: Statement Parse Endpoint and Session Artifacts
The agent service SHALL expose a statement parse endpoint accepting bank statement PDF files and returning row-structured results stored as TTL session artifacts, with raw PDF bytes never persisted.

#### Scenario: Parse single statement PDF into rows
- **WHEN** a client submits one PDF file (text-based, within page cap) to the parse endpoint
- **THEN** the service returns a `sessionId` plus per-file metadata (`fileName`, `pageCount`, `rowCount`, detected `bank`/`period` when identifiable) and row data (`date`, `description`, `amount`, `direction`)
- **THEN** raw PDF bytes are discarded after parsing and never written to D1 or KV

#### Scenario: Bulk upload parses per file into one session
- **WHEN** a client submits multiple PDF files in one request
- **THEN** each file is parsed independently with per-file status, and all rows join a single `sessionId`
- **THEN** a file that fails (unreadable, over page cap) reports its own error without failing the other files

#### Scenario: Reject oversized statements
- **WHEN** a submitted file exceeds 100 pages
- **THEN** the service rejects that file with a page-cap error naming the limit

#### Scenario: Reject password-protected PDFs
- **WHEN** a submitted PDF requires a password or PIN
- **THEN** the service rejects it with a clear error and never stores the file

#### Scenario: Reject scanned PDFs without text layer
- **WHEN** a submitted PDF has no extractable text layer
- **THEN** the service rejects it with a clear error directing the user to a text-based export

#### Scenario: Session artifacts expire via TTL
- **WHEN** a statement session is created
- **THEN** parsed rows are stored under `sessionId` with a TTL expiry
- **THEN** after expiry the rows are gone while conversation history (references and summaries) remains intact

### Requirement: Statement Rows Agent Tool
The agent service SHALL provide a `get_statement_rows` tool letting the model fetch parsed statement rows by `sessionId` with pagination and search during the agent loop.

#### Scenario: Agent pages statement rows
- **WHEN** the model calls `get_statement_rows` with a valid `sessionId`, `page`, and `pageSize`
- **THEN** the service returns that row window plus total count, scoped to the authenticated user

#### Scenario: Agent searches statement rows
- **WHEN** the model calls `get_statement_rows` with a `q` filter
- **THEN** the service returns only rows matching description or amount text

#### Scenario: Expired session returns a clear error
- **WHEN** the model calls `get_statement_rows` with an expired or unknown `sessionId`
- **THEN** the service returns an error directing the agent to ask the user to re-upload

### Requirement: Confirmation Gate for Statement Recording
Statement-derived transaction recording SHALL follow the existing mutation confirmation gate: the agent presents drafts and records only after explicit user confirmation via existing mutation tools.

#### Scenario: Agent presents drafts before recording
- **WHEN** the agent proposes recording statement rows as transactions
- **THEN** it presents the draft rows (date, description, amount, direction, target wallet) for user review first
- **THEN** no `create_transaction` or `create_transfer` call is made before the user confirms

### Requirement: Compact Financial Tool DTO and Payload Budget
The agent financial tools SHALL serialize compact summary DTOs bounded by a strict 3 Kilobyte payload budget to prevent LLM context saturation and token attention breakdown during multi-step tool execution.

#### Scenario: Compact Horizon Projection Return Shape
- **WHEN** the agent invokes `horizon_projection` for multi-period projections (up to 24 months)
- **THEN** the tool returns a compact trajectory DTO containing `periodKey`, `startDate`, `endDate`, monthly cashflow breakdown, net worth trajectory, and milestone goals
- **AND** repetitive raw wallet balance listings across individual periods SHALL be omitted
- **AND** the serialized JSON payload SHALL remain below 3 Kilobytes.

### Requirement: Defensive Stream Synthesis Recovery
The agent streaming pipeline SHALL implement defensive recovery when upstream model providers emit continuation errors or `MALFORMED_FUNCTION_CALL` after Step 1 tools have already succeeded, capturing tool execution results in real-time.

#### Scenario: Graceful Text Fallback on Function Calling Failure
- **WHEN** all tool calls in an initial execution step complete successfully but the upstream model fails on continuation (e.g. `MALFORMED_FUNCTION_CALL`)
- **THEN** the agent pipeline SHALL NOT emit developer error banners (`⚠️` or `MALFORMED`) to the user interface
- **AND** the agent SHALL trigger a text-only synthesis completion grounded on the in-memory tool results and stream the synthesized response to the client.

#### Scenario: Real-Time Tool Result Capture Preceding Step 2
- **WHEN** tools execute during an agent turn
- **THEN** tool execution results are pushed immediately into an in-memory capture buffer as each tool resolves
- **AND** the captured tool data is available to stream error handlers and catch blocks without waiting for or depending on the terminal `onFinish` event

### Requirement: Contract-Driven Tool Parameter Conformance
All tool parameter serialization in `apps/agent` SHALL strictly conform to the upstream ReedRich MCP route schemas to guarantee zero HTTP 400 validation rejections.

#### Scenario: Conforming Query Parameter Mapping
- **WHEN** the model generates tool calls with compound sort parameters (e.g. `date_desc`, `amount_desc`) or truncated date strings (`YYYY-MM`)
- **THEN** the tool parameter layer SHALL normalize parameters into valid backend keys (`orderBy`, `direction`, `startDate`, `endDate`) before dispatching HTTP requests.

### Requirement: Multi-Turn Role Alternation Sanitization
The agent service SHALL sanitize in-memory conversation history (`priorMessages`) prior to passing messages to LLM providers, guaranteeing strict role alternation (`user` $\rightarrow$ `assistant` $\rightarrow$ `user`) and preventing consecutive messages of identical roles from causing provider HTTP 400 failures, while preserving 100% of user and assistant messages intact in Cloudflare D1.

#### Scenario: Trailing Dangling User Turn Sanitization
- **WHEN** client sends a new chat message or retries a failed turn in a conversation whose most recent stored message in D1 is a `user` turn (due to a previous uncompleted or failed assistant response)
- **THEN** the server detects the dangling trailing `user` message in `priorMessages`
- **AND** the server prunes or folds the dangling turn from the model payload so that the new turn is appended only after an `assistant` turn (or at the root of a fresh turn sequence)
- **AND** the original user message in D1 is NOT deleted from the database or the client UI history

#### Scenario: Consecutive Duplicate Roles Pruned from Model Payload
- **WHEN** historical messages loaded from D1 contain consecutive identical roles (e.g. `user` followed immediately by `user`)
- **THEN** the sanitizer collapses or drops intermediate unresponded user turns in the in-memory array passed to the model runner
- **AND** the upstream Gemini or Groq model receives a strictly alternating message sequence (`user` $\rightarrow$ `assistant` $\rightarrow$ `user`)

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
