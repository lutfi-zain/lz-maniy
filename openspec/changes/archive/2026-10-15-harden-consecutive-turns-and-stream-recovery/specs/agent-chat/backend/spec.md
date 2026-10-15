# agent-chat/backend Specification Delta

## ADDED Requirements

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

## MODIFIED Requirements

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
