## ADDED Requirements

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
- **THEN** the backend SHALL record a score of `1.0` in Langfuse Scores and Phoenix `project_session_annotations` / `trace_annotations`.

#### Scenario: Negative Feedback Ingestion & Alert Dispatch
- **WHEN** a user clicks 👎 on an assistant message
- **THEN** the backend SHALL record a score of `0.0` in Langfuse and Phoenix, and trigger an incident alert to Telegram.

### Requirement: Tiered Post-Production Evaluators and Numeric Grounding
The evaluation framework SHALL execute deterministic code evaluators and calibrated binary LLM judges against chat turns to detect balance hallucinations, currency formatting violations, and reserve cash depletion.

#### Scenario: Deterministic Numeric Grounding Code Evaluator
- **WHEN** an assistant message completes
- **THEN** a deterministic code evaluator SHALL extract all monetary quantities and verify they originate from either user input or tool execution JSON payloads
- **AND** any fabricated balance SHALL assign a score of `0.0` with `label: "hallucination_detected"`.

#### Scenario: Calibrated Binary LLM Judges
- **WHEN** evaluating nuanced financial logic (`locked_cash_guard`, `plan_feasibility`, `tool_relevance`)
- **THEN** the evaluation SHALL use binary (`pass`/`fail`) scoring with rationales calibrated against human ground truth with TPR $\ge$ 90% and TNR $\ge$ 90%.

### Requirement: Adaptive Sampling for Continuous Production Evaluation
The agent backend SHALL execute continuous evaluations asynchronously in `c.executionCtx.waitUntil()` without blocking user streaming response time, using an adaptive sampling strategy to respect Worker resource quotas.

#### Scenario: 100% Negative Signal Sampling
- **WHEN** a turn receives negative user feedback (👎) or encounters a tool execution error
- **THEN** the turn SHALL be evaluated at 100% sample rate.

#### Scenario: 15% Baseline Passing Sampling
- **WHEN** a turn completes without errors or negative feedback
- **THEN** the turn SHALL be evaluated at a 15% random sample rate to conserve subrequest and token budgets.

### Requirement: Telegram Incident Alert Webhook Hook
The observability framework SHALL transmit structured incident alerts to Telegram via `@developer_ai_guweh_bot` on critical anomalies.

#### Scenario: Telegram Notification on Negative Signal
- **WHEN** a user submits negative feedback, faithfulness falls below 0.6, or latency exceeds 25 seconds
- **THEN** an alert card SHALL be dispatched to the designated Telegram chat containing session ID, user prompt, and direct links to Phoenix and Langfuse trace views.

### Requirement: Secret Credential Isolation for Telegram and Gateway Keys
The system SHALL guarantee that `TELEGRAM_BOT_TOKEN` and `OMP_GATEWAY_KEY` are stored strictly in Cloudflare Worker Secrets and gitignored `.dev.vars`, with zero tokens in repository commits.

#### Scenario: Pre-Commit Secret Scanner Validation
- **WHEN** `bun scripts/check-secrets.ts` runs
- **THEN** zero instances of Telegram bot tokens or API keys SHALL be present in tracked files.
