# Spec Delta

## Purpose

Per-user credit balance system that meters AI model usage by token consumption, enforces balance limits before requests, records credit transactions in a ledger, and exposes configurable pricing per model.

## ADDED Requirements

### Requirement: User Credit Balance
The credit system SHALL maintain a per-user credit balance initialized to a configurable default (2000 credits) upon first authenticated chat request.

#### Scenario: First-Time User Initialization
- **WHEN** an authenticated user sends their first `POST /api/chat` request and no `user_credits` row exists for their `userId`
- **THEN** the system creates a `user_credits` record with `balance` set to the configured default (2000), `lifetime_used` set to 0, and timestamps set to current epoch

#### Scenario: Balance Query
- **WHEN** an authenticated user sends `GET /api/credits`
- **THEN** the system returns `{ balance: number, lifetimeUsed: number, defaultBalance: number, creditValueUsd: number }`

### Requirement: Token-Based Credit Deduction
The credit system SHALL deduct credits from the user's balance after each completed model call based on actual token usage and the model's configured pricing rate.

#### Scenario: Post-Stream Credit Deduction
- **WHEN** a streaming chat response completes and the model reports `promptTokens` and `completionTokens` usage
- **THEN** the system calculates `creditsUsed = (promptTokens * inputRate / 1_000_000 + completionTokens * outputRate / 1_000_000) / creditValueUsd` where `creditValueUsd = 0.0005` and rates come from the model's pricing configuration
- **THEN** the system atomically decrements the user's `balance` by `creditsUsed` and increments `lifetime_used`

#### Scenario: Credit Deduction with Image Tokens
- **WHEN** the completed request included image attachments
- **THEN** the token count includes the image token overhead (2048 tokens per image for Groq, variable for Gemini) in the input token total before computing credits

#### Scenario: Insufficient Balance Pre-Check
- **WHEN** a user sends `POST /api/chat` and their `balance` is 0 or negative
- **THEN** the system returns HTTP 402 with `{ error: 'insufficient_credits', message: 'Kredit habis. Hubungi admin untuk top-up.', balance: 0 }`
- **THEN** no model call is made and no message is persisted

### Requirement: Credit Transaction Ledger
The credit system SHALL record every credit deduction as a transaction for audit and monitoring.

#### Scenario: Transaction Record on Deduction
- **WHEN** credits are deducted after a model call
- **THEN** a `credit_transactions` row is inserted with `userId`, `model` identifier, `inputTokens`, `outputTokens`, `creditsUsed`, `conversationId`, and `createdAt`

#### Scenario: Transaction History Query
- **WHEN** an authenticated user sends `GET /api/credits/history?limit=50`
- **THEN** the system returns the most recent 50 credit transactions ordered by `createdAt` descending, each containing `{ model, inputTokens, outputTokens, creditsUsed, conversationId, createdAt }`

### Requirement: Model Pricing Configuration
The credit system SHALL store per-model pricing rates that determine how tokens convert to credits.

#### Scenario: Pricing Table Contents
- **WHEN** the system initializes or the pricing table is queried
- **THEN** each model in `AVAILABLE_MODELS` has a corresponding `credit_pricing` row with `model` (primary key), `inputPerMillion` (USD per 1M input tokens), `outputPerMillion` (USD per 1M output tokens), and `updatedAt`

#### Scenario: Default Pricing Values
- **WHEN** no pricing row exists for a model at deduction time
- **THEN** the system falls back to a conservative default rate of `inputPerMillion = 0.75, outputPerMillion = 3.75` (matching Gemini Flash tier pricing)

### Requirement: Credit Metadata in Stream Response
The credit system SHALL include credit usage and remaining balance information in the stream finish metadata for ALL provider paths (Gemini native runner AND AI SDK path).

#### Scenario: Credits in Gemini Native Runner Finish Event
- **WHEN** a Gemini native runner streaming response completes successfully
- **THEN** the `d:` SSE finish event includes `creditsUsed` (REAL, this turn's cost) and `creditsRemaining` (REAL, balance after deduction) computed from actual `usageMetadata.promptTokenCount` and `usageMetadata.candidatesTokenCount` reported by the Gemini API
- **THEN** hardcoded placeholder token counts (`promptTokens:100,completionTokens:100`) are NOT used

#### Scenario: Credits in AI SDK Path Finish Event
- **WHEN** an AI SDK streaming response completes via `onFinish`
- **THEN** the custom `d:` finish metadata injected into the stream includes `creditsUsed` and `creditsRemaining` alongside the standard `finishReason` and `usage`

#### Scenario: Credits on Insufficient Balance (Pre-check Passed but Exhausted Mid-Stream)
- **WHEN** a user's balance was positive at pre-check but the actual usage exceeds the remaining balance
- **THEN** the system allows the request to complete (no mid-stream abort), deducts the full amount (balance may go negative), and the finish metadata shows the negative balance
- **THEN** subsequent requests are blocked until balance is replenished

### Requirement: Frontend Credit Balance Refresh
The frontend SHALL refresh the credit balance after each completed chat stream, regardless of whether the `d:` event contains credit data.

#### Scenario: Post-Stream Credit Refetch
- **WHEN** a chat stream completes (success or error) and the SSE connection closes
- **THEN** the frontend calls `GET /api/credits` to refresh `creditsRemaining` from the server
- **THEN** `CreditIndicator` reflects the updated balance within 2 seconds of stream end

#### Scenario: SSE Credit Data Takes Priority
- **WHEN** the `d:` finish event includes `creditsRemaining`
- **THEN** the frontend applies this value immediately and skips the redundant refetch
