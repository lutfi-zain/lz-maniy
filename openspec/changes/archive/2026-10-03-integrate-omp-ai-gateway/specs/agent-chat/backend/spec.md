# Spec Delta

## ADDED Requirements

### Requirement: OMP Gateway Provider Routing

The agent service SHALL support model selection and execution via the OMP Auth Gateway (`https://ai.membran.app/v1` or configured `OMP_GATEWAY_URL`) using `@ai-sdk/openai`, authenticating upstream requests with the bearer token from `OMP_GATEWAY_KEY`.

#### Scenario: Request routed to OMP Gateway
- **WHEN** client sends `POST /api/chat` with an OMP-hosted model (e.g. `google-antigravity/gemini-3.7-flash` or `opencode-zen/muse-spark-1.3-contributor-free`)
- **THEN** the service instantiates the OpenAI-compatible client configured with the OMP gateway baseURL and apiKey, and streams text tokens, tool execution events, and thought deltas using SSE data stream protocol

#### Scenario: Missing Gateway Configuration Graceful Degradation
- **WHEN** `OMP_GATEWAY_KEY` is not configured in the worker environment bindings
- **THEN** the server returns an HTTP 500 JSON error indicating gateway credentials are not configured, without crashing worker runtime

### Requirement: Curated OMP Gateway Model Lineup

The agent service SHALL restrict available models in `AVAILABLE_MODELS` exclusively to Google Antigravity Gemini (`google-antigravity/gemini-3.1-flash-lite`, `google-antigravity/gemini-3.7-flash`, `google-antigravity/gemini-3.8-flash`) and OpenCode Spark 1.3 Free (`opencode-zen/muse-spark-1.3-contributor-free`). Direct Groq and legacy unproxied models SHALL be removed from active listing.

#### Scenario: Public Model Listing via GET /api/models
- **WHEN** client sends `GET /api/models`
- **THEN** the response returns exactly 4 models: 3 Google Antigravity Gemini variants and 1 OpenCode Spark 1.3 Free variant, each flagged with their respective capabilities (`vision`, `tool_calling`, `thinking`)

### Requirement: Gateway Reasoning and Thinking Level Mapping

The agent service SHALL map client-requested `thinkingLevel` (`off`, `minimal`, `low`, `medium`, `high`) to `reasoningEffort` or OpenAI provider options when invoking reasoning models through the OMP gateway.

#### Scenario: Thinking Level Propagation to OMP Gateway
- **WHEN** client submits a request with `thinkingLevel: 'high'` for `google-antigravity/gemini-3.7-flash`
- **THEN** the request to OMP gateway includes `reasoning_effort: 'high'`, prompting the upstream model to emit reasoning tokens before synthesis
