# Spec Delta: agent-chat/backend

## MODIFIED Requirements

### Requirement: Multi-Provider Model Selection
The agent service SHALL support model selection between Google Gemini, Groq, and OpenCode providers using system-managed environment API keys or default public tokens.

#### Scenario: Provider and Model Routing
- **WHEN** client requests a Gemini model (e.g. `gemini-3.1-flash-lite`, `gemini-3.6-flash`) or a Groq model (e.g. `openai/gpt-oss-20b`)
- **THEN** the service instantiates the corresponding Vercel AI SDK provider with the updated valid `GEMINI_API_KEY` or `GROQ_API_KEY` from worker environment bindings
- **THEN** requests route to the designated provider without requiring client-supplied API keys

#### Scenario: Public Model Listing
- **WHEN** an unauthenticated client sends `GET /api/models`
- **THEN** the server returns HTTP 200 with the list of supported models, their display names, providers, and capabilities (`vision`, `tool_calling`) without requiring an Authorization header
- **THEN** non-functional OpenCode models are excluded from the active listing

#### Scenario: OpenCode Provider Routing with Public Token
- **WHEN** client requests a legacy conversation or payload specifying provider `opencode`
- **THEN** the service safely falls back to the default Gemini model (`gemini-3.1-flash-lite`) instead of triggering upstream 500 or 403 network crashes

#### Scenario: Gemini High-Demand Error Handling
- **WHEN** an upstream Gemini request returns HTTP 503 due to temporary high demand spikes (e.g. on `gemini-3.7-flash` or `gemini-3.8-flash`)
- **THEN** the runner catches the error and surfaces a descriptive stream message recommending fallback to `gemini-3.1-flash-lite` or retry
