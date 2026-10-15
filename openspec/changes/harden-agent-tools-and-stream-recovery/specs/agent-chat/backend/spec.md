## ADDED Requirements

### Requirement: Compact Financial Tool DTO and Payload Budget
The agent financial tools SHALL serialize compact summary DTOs bounded by a strict 3 Kilobyte payload budget to prevent LLM context saturation and token attention breakdown during multi-step tool execution.

#### Scenario: Compact Horizon Projection Return Shape
- **WHEN** the agent invokes `horizon_projection` for multi-period projections (up to 24 months)
- **THEN** the tool returns a compact trajectory DTO containing `periodKey`, `startDate`, `endDate`, monthly cashflow breakdown, net worth trajectory, and milestone goals
- **AND** repetitive raw wallet balance listings across individual periods SHALL be omitted
- **AND** the serialized JSON payload SHALL remain below 3 Kilobytes.

### Requirement: Defensive Stream Synthesis Recovery
The agent streaming pipeline SHALL implement defensive recovery when upstream model providers emit continuation errors or `MALFORMED_FUNCTION_CALL` after Step 1 tools have already succeeded.

#### Scenario: Graceful Text Fallback on Function Calling Failure
- **WHEN** all tool calls in an initial execution step complete successfully but the upstream model fails on continuation (e.g. `MALFORMED_FUNCTION_CALL`)
- **THEN** the agent pipeline SHALL NOT emit developer error banners (`⚠️` or `MALFORMED`) to the user interface
- **AND** the agent SHALL trigger a text-only synthesis completion grounded on the in-memory tool results and stream the synthesized response to the client.

### Requirement: Contract-Driven Tool Parameter Conformance
All tool parameter serialization in `apps/agent` SHALL strictly conform to the upstream ReedRich MCP route schemas to guarantee zero HTTP 400 validation rejections.

#### Scenario: Conforming Query Parameter Mapping
- **WHEN** the model generates tool calls with compound sort parameters (e.g. `date_desc`, `amount_desc`) or truncated date strings (`YYYY-MM`)
- **THEN** the tool parameter layer SHALL normalize parameters into valid backend keys (`orderBy`, `direction`, `startDate`, `endDate`) before dispatching HTTP requests.
