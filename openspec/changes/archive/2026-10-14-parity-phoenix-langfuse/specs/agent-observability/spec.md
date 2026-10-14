## ADDED Requirements

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
