# Spec Delta

## Purpose
Cloudflare Worker backend service providing real-time streaming AI chat powered by Vercel AI SDK, executing financial data tools against the Reedrich REST API and UI command tools for frontend orchestration, authenticated via Reedrich OAuth token passthrough and backed by Cloudflare D1 and KV.

## ADDED Requirements

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
The agent service SHALL support model selection between Google Gemini and Groq providers using system-managed environment API keys.

#### Scenario: Provider and Model Routing
- **WHEN** client requests a Gemini model (e.g. `gemini-1.5-flash`, `gemini-1.5-pro`) or a Groq model (e.g. `llama-3.3-70b-versatile`)
- **THEN** the service instantiates the corresponding Vercel AI SDK provider with `GEMINI_API_KEY` or `GROQ_API_KEY` from worker environment bindings
- **THEN** requests route to the designated provider without requiring client-supplied API keys

#### Scenario: Public Model Listing
- **WHEN** an unauthenticated client sends `GET /api/models`
- **THEN** the server returns HTTP 200 with the list of supported models, their display names, providers, and capabilities (`vision`, `tool_calling`) without requiring an Authorization header

### Requirement: Multi-Step Tool Calling Agent Loop
The agent service SHALL execute an agent loop with `maxSteps` (up to 10 steps) allowing the model to invoke multiple tools sequentially before returning a final answer.

#### Scenario: Tool Invocation Sequence
- **WHEN** a user prompt requires retrieving account data before answering (e.g. "Berapa sisa budget makan bulan ini?")
- **THEN** the model emits a tool call for `get_snapshot`, the server executes the tool against Reedrich API, returns the tool result to the model, and the model synthesizes the answer within `maxSteps`

#### Scenario: Tool Execution Failure Propagation
- **WHEN** a tool execution fails (e.g. Reedrich API returns 500 or 404 for a transaction ID)
- **THEN** the tool returns a structured error object `{ error: string, code: number }` as its tool result
- **THEN** the agent loop feeds the error back to the model so it can explain the problem gracefully to the user instead of aborting the request

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
