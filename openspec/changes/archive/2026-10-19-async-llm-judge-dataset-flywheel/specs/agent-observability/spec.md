## MODIFIED Requirements

### Requirement: Continuous Evaluation and Decoupled Job Dispatch
The agent backend SHALL execute continuous evaluations without blocking user streaming response time, performing fast deterministic assertions in `c.executionCtx.waitUntil()` and enqueuing semantic evaluation tasks into a decoupled persistent queue for scheduled execution.

#### Scenario: Hybrid evaluation lifecycle
- **WHEN** a streaming chat response completes
- **THEN** the system executes deterministic code evaluators in `c.executionCtx.waitUntil()`, streams preliminary scores to Langfuse, and enqueues the turn into `eval_queue` for asynchronous LLM-as-a-judge evaluation if the turn meets sampling criteria or triggers an anomaly.

## ADDED Requirements

### Requirement: Observability Correlation for Curated Dataset Candidates
The observability framework SHALL preserve and link original OpenTelemetry trace identifiers (`traceId`, `spanId`) and Langfuse observation IDs across curated dataset candidates and subsequent regression experiment runs.

#### Scenario: Tracing dataset candidate lineage
- **WHEN** a failed production trace is staged in `eval_dataset_candidates` and synced to Phoenix or Langfuse
- **THEN** the metadata of the dataset example SHALL retain `source_trace_id`, `source_session_id`, and `original_anomaly_label` to enable one-click navigation from dataset items back to the historical production trace.
