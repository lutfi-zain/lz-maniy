# agent-observability Specification

## Purpose

Distributed tracing and runtime observability framework for Maniyy v2 financial agent that streams OpenTelemetry spans to Arize Phoenix across browser, edge worker, and data layer environments.

## Requirements

### Requirement: Multi-Environment OpenTelemetry Export
The observability framework SHALL transmit OpenTelemetry spans using OTLP HTTP to the self-hosted Arize Phoenix collector, partitioned by execution environment.

#### Scenario: Ingestion to Arize Phoenix via OTLP HTTP
- **WHEN** the agent handles a request or executes an action in `apps/agent`
- **THEN** generated spans are formatted according to OTLP HTTP JSON/Protobuf standards and exported asynchronously to `https://phoenix.membran.app/v1/traces` with bearer authentication

#### Scenario: Resource Attributes and Project Tagging
- **WHEN** spans are generated across different execution environments (local dev, CI runner, or Cloudflare Workers production)
- **THEN** resource attributes identify `service.name` as `maniyy-agent`, `deployment.environment` as `local`, `ci`, or `production`, and route to corresponding Phoenix project names (`maniyy-agent-local`, `maniyy-agent-ci`, `maniyy-agent-production`)

### Requirement: End-to-End Hierarchical Span Waterfall
The agent execution pipeline SHALL generate nested OpenTelemetry spans capturing every stage of request lifecycle and multi-step reasoning.

#### Scenario: Ingress and Security Spans
- **WHEN** an incoming HTTP request hits `POST /api/chat`
- **THEN** the framework generates a root HTTP span containing child spans for `authMiddleware` (token verification) and `creditPreCheck` (initial D1 balance query)

#### Scenario: Model Inference and Step Spans
- **WHEN** Vercel AI SDK executes `streamText` across one or more reasoning steps
- **THEN** each inference step generates a span recording model name, reasoning effort, prompt tokens, completion tokens, TTFT (time-to-first-token), and overall latency

#### Scenario: Tool Execution Spans
- **WHEN** the agent invokes financial tools (e.g. `get_snapshot`, `create_transaction`, `transfer_funds`)
- **THEN** each tool invocation generates an individual child span capturing sanitized tool input parameters, target endpoint or table, duration, and execution success status

#### Scenario: Token and Credit Settlement Metadata
- **WHEN** the response stream completes and credit deduction occurs
- **THEN** a final span records calculated credits used, remaining balance, and writes to `credit_transactions` and `messages` tables

### Requirement: Frontend-to-Backend Context Propagation
The financial client application SHALL propagate distributed trace context from the user interface into the edge backend.

#### Scenario: Traceparent Header Injection from Svelte 5
- **WHEN** the user submits a message in the chat drawer or accounts view in `apps/web`
- **THEN** the client generates a W3C trace context and injects the `traceparent` header into the outgoing `POST /api/chat` request

#### Scenario: Correlated Root Trace Visualization
- **WHEN** a distributed trace is inspected in the Arize Phoenix web UI
- **THEN** the root span originates at the client interaction and links child spans from edge routing, model inference, and database mutations within a unified waterfall view

### Requirement: Error and Exception Tracing
The observability framework SHALL record structured exception details on active spans when failures occur during agent execution.

#### Scenario: Tool Invocation Error Capture
- **WHEN** an external API call to ReedRich fails (e.g. 500 error or validation failure)
- **THEN** the corresponding tool span sets OpenTelemetry status to `ERROR`, records the error message and stack trace, and allows root trace completion

#### Scenario: Insufficient Credit Error Capture
- **WHEN** a user request is rejected due to empty credit balance (402 Payment Required)
- **THEN** the credit check span marks error status `insufficient_credits` with current balance recorded in span attributes

### Requirement: Trace-to-Dataset Example and Experiment Run Linkage
The observability framework SHALL link OpenInference trace spans in `maniyy-agent-evals` directly to `dataset_examples.span_rowid` and `experiment_runs.trace_id`.

#### Scenario: Drilldown from Experiment Run to 5-Level Trace Waterfall
- **WHEN** an operator clicks the trace icon on any example row inside an Arize Phoenix Experiment
- **THEN** the UI opens the corresponding 5-level OpenInference trace waterfall (`POST /api/chat` -> `authAndCreditGuard` -> `contextPooling & RAG` -> `agent.orchestratorLoop` -> `eval.qualityGateAssertions` -> `creditSettlement`)

### Requirement: Deep OpenInference Semantic Attributes for LLM, RETRIEVER, and TOOL Spans
The observability framework SHALL populate flattened OpenInference semantic convention attributes across `LLM`, `RETRIEVER`, and `TOOL` spans to enable native Phoenix UI renderers.

#### Scenario: LLM Span Chat Message Bubbles and Tool Schema Rendering
- **WHEN** an `LLM` span is recorded during agent inference
- **THEN** the span includes flattened `llm.input_messages.{i}.message.{role,content}`, `llm.output_messages.0.message.{role,content}`, `llm.output_messages.0.message.tool_calls.{j}.tool_call.function.{name,arguments}`, `llm.tools.{k}.tool.json_schema`, and `llm.invocation_parameters` so Phoenix renders Chat Message Bubbles and activates Playground replay

#### Scenario: RETRIEVER Span Document Cards and Relevance Annotations
- **WHEN** a `RETRIEVER` span (`memory.getAgentMemory` or `state.hydratePageContext`) executes
- **THEN** the span records flattened `retrieval.documents.{i}.document.{id,content,score,metadata}` attributes and links per-document relevance scores in `document_annotations`

#### Scenario: TOOL Span JSON Schema and PII Redaction Guard
- **WHEN** a `TOOL` span executes or trace attributes are serialized
- **THEN** the span records `tool.description`, `tool.parameters` (JSON Schema), and `output.mime_type = "application/json"`, while automatically redacting Bearer tokens, API keys (`rd_live_*`, `fp_live_*`, `gsk_*`, `AIza*`), NIK, and bank account numbers, and honoring `OPENINFERENCE_HIDE_INPUTS` / `OPENINFERENCE_HIDE_OUTPUTS`

### Requirement: Outbound W3C Traceparent Propagation from Agent Tools to MCP Backend
The observability framework SHALL propagate the active W3C `traceparent` header and project identifier on every outgoing HTTP or Service-Binding request from `apps/agent` tools (`createApiClient`) to the ReedRich MCP backend (`finnplan-mcp`).

#### Scenario: Tool RPC Traceparent Header Injection
- **WHEN** an agent tool (via AI SDK `streamText` or native `createGeminiRunner`) invokes `createApiClient().request(path, init)` while an active span (`reedrich.rpc:*` or `tool:*`) is open
- **THEN** `createApiClient` injects `traceparent: 00-<traceId>-<activeSpanId>-01`, `x-project-name: <projectName>`, and `x-phoenix-project: <projectName>` into the outgoing request headers so downstream `reedrich-mcp` spans attach as children of the active RPC span within the same Phoenix trace waterfall

### Requirement: Dashboard REST Store W3C Traceparent Propagation
The financial dashboard store (`ReedrichStore` in `apps/web/src/lib/stores/reedrich.svelte.ts`) SHALL attach a W3C `traceparent` header on all outgoing REST read and CRUD mutation requests.

#### Scenario: Automatic Traceparent Header on Dashboard REST Calls
- **WHEN** `ReedrichStore.request(url, init)` executes any read (`fetchSnapshot`, `fetchTransactions`, `fetchHorizonProjections`, `fetchWallets`, etc.) or write (`createTransaction`, `createTransfer`, `updateBudget`, etc.) call
- **THEN** the store attaches a valid W3C `traceparent` header (`^00-[0-9a-f]{32}-[0-9a-f]{16}-01$`) unless one was already explicitly provided in `init.headers`
