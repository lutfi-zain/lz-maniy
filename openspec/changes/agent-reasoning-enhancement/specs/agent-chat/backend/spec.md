# Spec Delta: agent-chat/backend

## MODIFIED Requirements

### Requirement: Multi-Provider Model Selection
The agent service SHALL support model selection between Google Gemini, Groq, and OpenCode providers using system-managed environment API keys or default public tokens.

#### Scenario: Provider and Model Routing
- **WHEN** client requests a Gemini model (e.g. `gemini-1.5-flash`, `gemini-1.5-pro`) or a Groq model (e.g. `llama-3.3-70b-versatile`)
- **THEN** the service instantiates the corresponding Vercel AI SDK provider with `GEMINI_API_KEY` or `GROQ_API_KEY` from worker environment bindings
- **THEN** requests route to the designated provider without requiring client-supplied API keys

#### Scenario: Public Model Listing
- **WHEN** an unauthenticated client sends `GET /api/models`
- **THEN** the server returns HTTP 200 with the list of supported models, their display names, providers, and capabilities (`vision`, `tool_calling`) without requiring an Authorization header

#### Scenario: OpenCode Provider Routing with Public Token
- **WHEN** client requests an OpenCode model (e.g. `muse-spark-1.3-contributor-free`, `deepseek-v4-flash-free`) with provider `opencode`
- **THEN** the service instantiates the OpenCode adapter targeting `https://opencode.ai/zen/v1` with `Authorization: Bearer public` (or environment `OPENCODE_API_KEY`)
- **THEN** the outbound request contains official OpenCode CLI headers (`User-Agent`, `x-opencode-client: cli`, `x-opencode-project: global`, `x-opencode-session`, `x-opencode-request`) preventing `403 FreeTierError`

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

## ADDED Requirements

### Requirement: Configurable Thinking Level Execution
The agent service SHALL accept and apply thinking level configurations to supported reasoning models.

#### Scenario: Gemini Thinking Config Propagation
- **WHEN** client submits a request with `thinkingLevel` (`off`, `minimal`, `low`, `medium`, `high`)
- **THEN** the native Gemini runner maps the level to `thinkingConfig` (`thinkingBudget: 0` for `off`, or appropriate token budgets / levels for `minimal`/`low`/`medium`/`high`)
- **THEN** the model output streams smoothly without failing render or dropping tool execution
