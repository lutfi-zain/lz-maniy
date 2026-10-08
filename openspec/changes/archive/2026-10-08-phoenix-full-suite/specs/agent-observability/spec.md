## ADDED Requirements

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
