# agent-observability Specification

## Purpose

Distributed tracing and runtime observability framework for Maniyy v2 financial agent that streams OpenTelemetry spans to Arize Phoenix and Langfuse Cloud across browser, edge worker, and data layer environments.

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

### Requirement: Dual-Export to Langfuse OTLP Endpoint
The observability framework SHALL transmit OpenTelemetry spans concurrently to Langfuse Cloud using OTLP Protobuf over HTTP as a secondary observability destination alongside Arize Phoenix.

#### Scenario: Successful concurrent export to Langfuse and Phoenix
- **WHEN** an HTTP request or evaluation run completes, and both Phoenix and Langfuse configurations are active
- **THEN** traces SHALL be serialized to Protobuf format and dispatched concurrently to both Phoenix and Langfuse endpoints
- **AND** the Langfuse HTTP request SHALL include `Authorization: Basic <base64-encoded-keys>` and `x-langfuse-ingestion-version: 4` headers.

#### Scenario: Isolated failure tolerance
- **WHEN** the Langfuse endpoint returns a non-200 HTTP response or experiences a network timeout
- **THEN** the failure SHALL be caught and logged as a warning
- **AND** it SHALL NOT abort the Phoenix trace export, throw an unhandled exception, or interrupt the user response stream.

### Requirement: Dynamic Environment Variable Toggle
The observability framework SHALL allow toggling Langfuse export on or off via environment variables without requiring code changes or application rebuilds.

#### Scenario: Langfuse disabled explicitly
- **WHEN** `LANGFUSE_ENABLED` is set to `"false"` in the execution environment
- **THEN** the framework SHALL NOT initiate any network requests to the Langfuse endpoint
- **AND** the application SHALL incur zero network latency overhead for Langfuse export.

#### Scenario: Langfuse disabled by missing credentials
- **WHEN** `LANGFUSE_PUBLIC_KEY` or `LANGFUSE_SECRET_KEY` is undefined or empty
- **THEN** the framework SHALL treat Langfuse export as disabled and bypass dispatch.

#### Scenario: Langfuse enabled
- **WHEN** both `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` are provided and `LANGFUSE_ENABLED` is not `"false"`
- **THEN** the framework SHALL automatically activate the secondary exporter.

### Requirement: Langfuse Context and Trace Correlation
The observability framework SHALL enrich root and nested spans with Langfuse-specific semantic attributes to enable session grouping and user drilldown in the Langfuse dashboard.

#### Scenario: User and conversation attribution
- **WHEN** an authenticated user initiates an agent chat turn
- **THEN** the root span and generation spans SHALL carry `langfuse.user.id` matching the authenticated `userId`
- **AND** they SHALL carry `langfuse.session.id` matching the active `conversationId`.

### Requirement: Zero-Secret Leakage and Credential Hygiene
The observability framework and associated deployment configurations SHALL strictly enforce zero hardcoded API keys or secret tokens in version-controlled files.

#### Scenario: Repository secret scan validation
- **WHEN** `bun scripts/check-secrets.ts` is executed against the working tree and staging area
- **THEN** zero occurrences of Langfuse secret keys (`sk-lf-*`) or raw authorization credentials SHALL be detected in tracked repository files.

### Requirement: Root Span Session and User Correlation Parity
The observability framework SHALL populate `session.id` and `user.id` attributes directly on the root HTTP server span for every conversational turn, ensuring Arize Phoenix and Langfuse Cloud index multi-turn conversation sessions with 100% parity.

#### Scenario: Real-time Session Indexing in Arize Phoenix
- **WHEN** an authenticated user submits a chat message to `POST /api/chat`
- **THEN** the root HTTP span SHALL be tagged with `session.id` set to the resolved `conversationId`
- **AND** the root HTTP span SHALL be tagged with `user.id` set to the authenticated `userId`
- **AND** Arize Phoenix SHALL group the trace under the corresponding session in its Sessions dashboard.

#### Scenario: Bidirectional Attribute Aliasing Across Spans
- **WHEN** any span attribute setter receives `conversation.id` or `session.id`
- **THEN** the span SHALL automatically populate `session.id`, `conversation.id`, and `langfuse.session.id` with the same identifier value.

### Requirement: Dual-Asset Synchronization for Prompts and Golden Datasets
The evaluation framework SHALL synchronize prompt templates and golden evaluation datasets concurrently to both Arize Phoenix and Langfuse Cloud, maintaining identical asset inventories across both platforms.

#### Scenario: Prompt Version Synchronization to Phoenix Hub and Langfuse Prompts
- **WHEN** the observability asset synchronization script executes
- **THEN** prompt versions for `system-baseline`, `system-compact`, and `system-fewshot` SHALL be committed to Arize Phoenix Prompt Hub
- **AND** the identical prompt versions SHALL be created or updated in Langfuse Prompt Management under matching names and tags.

#### Scenario: Golden Dataset Mirroring to Langfuse Datasets
- **WHEN** the observability asset synchronization script executes
- **THEN** the 16 test cases defined in `EVAL_DATASET` SHALL be synchronized into Phoenix Dataset `maniyy-agent-golden-dataset`
- **AND** the identical test cases SHALL be synchronized into Langfuse Dataset `maniyy-agent-golden-dataset` with identical inputs and expected assertion metadata.

### Requirement: Dual-Reporting for Evaluation and Benchmark Runs
The evaluation benchmark pipeline SHALL export evaluation results, assertion scores, and token metrics to both Arize Phoenix Experiments and Langfuse Dataset Runs.

#### Scenario: Concurrent Benchmark Execution Recording
- **WHEN** Promptfoo or evaluation suites execute test cases against agent model providers
- **THEN** evaluation outputs and scores SHALL be linked to the respective dataset item
- **AND** results SHALL be visible side-by-side in both Arize Phoenix Experiments and Langfuse Dataset Runs.

#### Scenario: Materializing Prompt Variant Experiment Runs in Langfuse
- **WHEN** `bun run sync:observability` or the benchmark matrix runner executes
- **THEN** 135 benchmark runs across 5 matrix experiments (`baseline`, `compact`, `fewshot`, `multiturn`, and `judge-calibration`) SHALL be exported to Langfuse Dataset Runs (`POST /api/public/dataset-run-items`) linked to `maniyy-agent-golden-dataset` items
- **AND** all corresponding assertion scores (`financial_grounding_judge`, `tool_dispatch_accuracy`, `idr_currency_compliance`) SHALL be attached to the respective dataset run items.

### Requirement: 72 Test Case Golden Evaluation Dataset Parity
The evaluation framework SHALL maintain an expanded 72 test case golden dataset in `apps/agent/eval/dataset.ts` covering multi-turn cashflow pacing, goal liquidation, locked wallet violation attacks, and negative formatting constraints, synchronized in 1:1 parity between Phoenix and Langfuse.

#### Scenario: Synchronizing Expanded Golden Dataset
- **WHEN** `bun run sync:observability` executes
- **THEN** all 72 test cases SHALL be synchronized to Phoenix Datasets and Langfuse Datasets (`maniyy-agent-golden-dataset`) with identical IDs and validation schemas.

### Requirement: OMP Gateway Playground & Dashboard Experiments Integration
The observability framework SHALL register OMP AI Gateway as an LLM provider across Phoenix and Langfuse, exposing active Google Antigravity Gemini models (`gemini-3.8-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-2.5-flash-lite`) for interactive prompt testing and offline experiments.

#### Scenario: Model Registry in Langfuse and Phoenix
- **WHEN** the synchronization runner executes
- **THEN** `omp-gateway` SHALL be configured in Langfuse LLM Connections and Phoenix Custom Generative Model Providers.

### Requirement: Real-Time User Feedback Ingestion
The application SHALL ingest explicit user feedback (thumbs up/down) from the chat interface and stream corresponding scores to Phoenix Annotations and Langfuse Scores.

#### Scenario: Positive Feedback Ingestion
- **WHEN** a user clicks 👍 on an assistant message
- **THEN** the backend SHALL record a score of `1.0` in Langfuse Scores with `name: "user_feedback"`, `dataType: "CATEGORICAL"`, and bound to the `user_feedback` score config ID, alongside Phoenix `project_session_annotations` / `trace_annotations`.

#### Scenario: Negative Feedback Ingestion & Alert Dispatch
- **WHEN** a user clicks 👎 on an assistant message
- **THEN** the backend SHALL record a score of `0.0` in Langfuse and Phoenix with `name: "user_feedback"` bound to the `user_feedback` score config ID, and trigger an incident alert to Telegram.

### Requirement: Tiered Post-Production Evaluators and Numeric Grounding
The evaluation framework SHALL execute deterministic code evaluators and calibrated binary LLM judges against chat turns to detect balance hallucinations, currency formatting violations, and reserve cash depletion.

#### Scenario: Deterministic Numeric Grounding Code Evaluator
- **WHEN** an assistant message completes
- **THEN** a deterministic code evaluator SHALL extract all monetary quantities and verify they originate from either user input or tool execution JSON payloads
- **AND** any fabricated balance SHALL assign a score of `0.0` with `label: "hallucination_detected"`.

#### Scenario: Calibrated Binary LLM Judges
- **WHEN** evaluating nuanced financial logic (`locked_cash_guard`, `plan_feasibility`, `tool_relevance`)
- **THEN** the evaluation SHALL use binary (`pass`/`fail`) scoring with rationales calibrated against human ground truth with TPR $\ge$ 90% and TNR $\ge$ 90%.

### Requirement: Continuous Evaluation and Decoupled Job Dispatch
The agent backend SHALL execute continuous evaluations without blocking user streaming response time, performing fast deterministic assertions in `c.executionCtx.waitUntil()` and enqueuing semantic evaluation tasks into a decoupled persistent queue for scheduled execution.

#### Scenario: Hybrid evaluation lifecycle
- **WHEN** a streaming chat response completes
- **THEN** the system executes deterministic code evaluators in `c.executionCtx.waitUntil()`, streams preliminary scores to Langfuse, and enqueues the turn into `eval_queue` for asynchronous LLM-as-a-judge evaluation if the turn meets sampling criteria or triggers an anomaly.

#### Scenario: 100% Negative Signal Sampling
- **WHEN** a turn receives negative user feedback (👎) or encounters a tool execution error
- **THEN** the turn SHALL be evaluated at 100% sample rate and enqueued with high priority.

#### Scenario: Baseline Passing Sampling
- **WHEN** a turn completes without errors or negative feedback
- **THEN** the turn SHALL be evaluated and enqueued at a 5% to 10% random sample rate to conserve subrequest and token budgets.
### Requirement: Telegram Incident Alert Webhook Hook
The observability framework SHALL transmit structured incident alerts to Telegram via `@developer_ai_guweh_bot` on critical anomalies.

#### Scenario: Telegram Notification on Negative Signal
- **WHEN** a user submits negative feedback, faithfulness falls below 0.6, or latency exceeds 25 seconds
- **THEN** an alert card SHALL be dispatched to the designated Telegram chat containing session ID, user prompt, and direct deep links to both Arize Phoenix (`${phoenixBaseUrl}/projects/.../traces/${traceId}`) and Langfuse Cloud (`${langfuseBaseUrl}/project/.../traces/${traceId}`) trace detail views.

### Requirement: Langfuse Canonical Score Configurations Registration
The observability synchronization suite SHALL register canonical Score Configurations in Langfuse Cloud via `POST /api/public/score-configs`, establishing 1:1 schema parity with Arize Phoenix `annotation_configs`.

#### Scenario: Registering Categorical and Numeric Score Schemas
- **WHEN** `bun run sync:observability` executes with Langfuse credentials configured
- **THEN** the synchronization runner SHALL create or verify the existence of 8 score configs:
  - `financial_grounding_judge`: CATEGORICAL with values `[{"label": "grounded", "value": 1.0}, {"label": "hallucinated", "value": 0.0}]`
  - `advisory_rubric_judge`: CATEGORICAL with values `[{"label": "excellent", "value": 1.0}, {"label": "acceptable", "value": 0.75}, {"label": "poor", "value": 0.0}]`
  - `multi_intent_completeness`: CATEGORICAL with values `[{"label": "complete", "value": 1.0}, {"label": "partial", "value": 0.5}, {"label": "incomplete", "value": 0.0}]`
  - `idr_currency_compliance`: CATEGORICAL with values `[{"label": "compliant", "value": 1.0}, {"label": "violation", "value": 0.0}]`
  - `tool_dispatch_accuracy`: CATEGORICAL with values `[{"label": "pass", "value": 1.0}, {"label": "fail", "value": 0.0}]`
  - `credit_settlement_audit`: CATEGORICAL with values `[{"label": "audited", "value": 1.0}, {"label": "unsettled", "value": 0.0}]`
  - `human_audit_review`: CATEGORICAL with values `[{"label": "approved", "value": 1.0}, {"label": "needs_revision", "value": 0.0}]`
  - `user_feedback`: CATEGORICAL with values `[{"label": "positive", "value": 1.0}, {"label": "negative", "value": 0.0}]`
  - `latency_ms`: NUMERIC with `minValue: 0` and `maxValue: 60000`
- **AND** the registration SHALL be idempotent, handling existing configs without failing.

### Requirement: Runtime Continuous Evaluation Score Streaming to Langfuse
The agent execution backend SHALL stream evaluated turn scores from continuous post-production evaluators (`evalNumericGrounding`, `evalCurrencyGovernance`, `evalNoEmoji`, `evalLockedCashGuard`) to the Langfuse Scores API (`POST /api/public/scores`).

#### Scenario: Streaming Evaluated Turn Scores to Langfuse Scores API
- **WHEN** a conversational turn undergoes continuous evaluation in `c.executionCtx.waitUntil()`
- **THEN** each evaluation result SHALL be posted to Langfuse `/api/public/scores` attached to `traceId` and `sessionId` with the corresponding `name`, `value`, `comment` (explanation), and `dataType`
- **AND** the score submission SHALL execute asynchronously without throwing errors if Langfuse is temporarily unreachable.

### Requirement: Custom Model Token Pricing Registration in Langfuse
The observability synchronization suite SHALL register custom model pricing for OMP AI Gateway models (`omp-gateway/google-antigravity/*`) in Langfuse via `POST /api/public/models`.

#### Scenario: Synchronizing Custom Gemini Antigravity Pricing
- **WHEN** the synchronization runner executes with Langfuse credentials configured
- **THEN** model entries for `google-antigravity/gemini-3.8-flash`, `google-antigravity/gemini-3.5-flash-lite`, `google-antigravity/gemini-3.1-flash-lite`, and `google-antigravity/gemini-2.5-flash-lite` SHALL be created or updated with input and output token unit prices
- **AND** subsequent traces ingested by Langfuse matching these model names SHALL compute non-zero estimated token costs.

### Requirement: Observability Correlation for Curated Dataset Candidates
The observability framework SHALL preserve and link original OpenTelemetry trace identifiers (`traceId`, `spanId`) and Langfuse observation IDs across curated dataset candidates and subsequent regression experiment runs.

#### Scenario: Tracing dataset candidate lineage
- **WHEN** a failed production trace is staged in `eval_dataset_candidates` and synced to Phoenix or Langfuse
- **THEN** the metadata of the dataset example SHALL retain `source_trace_id`, `source_session_id`, and `original_anomaly_label` to enable one-click navigation from dataset items back to the historical production trace.
