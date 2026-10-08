## ADDED Requirements

### Requirement: Deferred Trace Flushing After Streaming Response Completion
The observability framework SHALL defer OTLP trace flushing on streaming HTTP routes (`POST /api/chat`) until the response `ReadableStream` has completed consumption, all tool call child spans (`tool:*` and `reedrich.rpc:*`) have ended, `output.value` has been populated, and credit/message persistence has finished.

#### Scenario: Complete Span Tree Export on Streaming Chat Turn
- **WHEN** `POST /api/chat` returns a streaming `Response` (`transformedReadable` or `runGeminiStream`)
- **THEN** `tracingMiddleware` defers `tracer.flush()` until the `ReadableStream` `finally` block completes, ensuring `ai.streamText` carries `status_code = 'OK'`, populated `output.value`, and all child `tool:*`, `reedrich.rpc:*`, `creditSettlement`, and `db.insertMessage` spans are exported to Arize Phoenix

### Requirement: Mandatory OpenInference Span Kind Classification and Response Payload Capture
Every span created in `apps/agent` and `reedrich-mcp` (`finnplan-mcp`) SHALL include an explicit `openinference.span.kind` attribute (`CHAIN`, `GUARDRAIL`, `RETRIEVER`, `AGENT`, `LLM`, `TOOL`, or `EVALUATOR`) and sanitized `input.value` / `output.value` payloads so zero spans render as `UNKNOWN` or empty in Arize Phoenix.

#### Scenario: Zero UNKNOWN Span Kinds Across Agent and MCP Waterfall
- **WHEN** a request traverses `authMiddleware`, `creditPreCheck`, `contextRetrieval`, `ai.streamText`, `creditSettlement`, `db.insertMessage`, and `reedrich-mcp` HTTP/DB endpoints
- **THEN** every span specifies a valid `openinference.span.kind` (`GUARDRAIL` for auth/credit checks, `CHAIN` for HTTP and settlement/persistence steps, `TOOL` for tool/DB operations) and `reedrich-mcp` HTTP spans record sanitized JSON response payloads in `output.value`
