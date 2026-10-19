## MODIFIED Requirements

### Requirement: Multi-Step Tool Calling Agent Loop
The agent service SHALL execute an adaptive multi-step tool execution loop with dynamic step limits configured according to workload complexity, scaling from standard conversational queries (5–8 steps) up to dozens of steps (20–40 steps) for multi-page statement reconciliation and multi-period horizon simulations, guaranteeing non-empty natural language synthesis upon completion.

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

#### Scenario: High-iteration bank statement reconciliation
- **WHEN** a user initiates statement analysis requiring pagination across multiple statement shards or multi-month historical queries
- **THEN** the agent allocates a step budget up to 40 iterations and executes successive tool calls without premature termination at step 10.

#### Scenario: Step limit reached before task completion
- **WHEN** the agent loop exhausts the allocated step budget while intermediate tool results have been collected
- **THEN** the service forces a final synthesis turn without tool calls, presenting a structured summary of the data gathered so far and clearly noting any remaining incomplete steps.

### Requirement: Conversation Compaction
The agent service SHALL automatically compact conversation history when the estimated token count approaches the model's context window limit or exceeds the operational working memory budget.

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

#### Scenario: Working memory ceiling exceeded
- **WHEN** multi-turn conversation history exceeds the operational working memory budget
- **THEN** older dialogue turns are compacted into a structured summary preserving last known wallet balances, pending commitments, and active user preferences, while keeping the most recent turns intact.

#### Scenario: Compaction summary injection into active model prompt
- **WHEN** a conversation has been compacted and a new user turn arrives
- **THEN** the compacted financial snapshot is injected into the active prompt context so the model retains full continuity without losing entity awareness or historical commitments.

## ADDED Requirements

### Requirement: In-Flight Loop Detection & Circuit Breaker
The agent service SHALL track tool execution signatures during multi-step loops and abort cyclic repetition before budget exhaustion.

#### Scenario: Identical tool call oscillation detected
- **WHEN** the model generates identical tool calls with identical arguments twice consecutively and receives identical error or empty responses
- **THEN** the loop breaker trips, halts further redundant tool calls, and routes the gathered state to fallback synthesis with an explanation to the user.

### Requirement: Multi-Step Progress Telemetry Stream
The agent service SHALL emit intermediate progress events over the Server-Sent Events (SSE) data stream during high-iteration tool executions to maintain connection freshness and provide user feedback.

#### Scenario: Multi-turn tool execution in progress
- **WHEN** the agent is executing step 3 or higher of a multi-step sequence
- **THEN** the service streams intermediate status data frames with step count and action indicators to keep the edge connection active and inform the user of progress.

### Requirement: In-Flight Volatile Scratchpad Pruning
The agent service SHALL prune stale intermediate tool outputs during high-iteration sequences to prevent context saturation.

#### Scenario: High iteration sequence reaches step 10 or greater
- **WHEN** an agent workflow continues beyond 10 iterations
- **THEN** raw tool execution payloads older than the preceding two steps are truncated into summary digests within the in-memory scratchpad while retaining the accumulated state.
