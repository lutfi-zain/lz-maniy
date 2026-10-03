# Spec Delta

## ADDED Requirements

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
- **THEN** the service defaults to `google-antigravity/gemini-3.7-flash` with provider `omp`

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
