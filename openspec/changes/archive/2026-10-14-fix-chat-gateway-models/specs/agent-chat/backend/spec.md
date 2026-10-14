## MODIFIED Requirements

### Requirement: Curated OMP Gateway Model Lineup
The agent service SHALL restrict available models in `AVAILABLE_MODELS` exclusively to verified, functioning Google Antigravity Gemini models supported by the upstream OMP AI Gateway.

#### Scenario: Verified Gateway Model Listing
- **WHEN** `AVAILABLE_MODELS` is evaluated or queried via `GET /api/models`
- **THEN** it contains only verified models:
  - `google-antigravity/gemini-3.8-flash`
  - `google-antigravity/gemini-3.5-flash-lite`
  - `google-antigravity/gemini-3.1-flash-lite`
  - `google-antigravity/gemini-2.5-flash`
  - `google-antigravity/gemini-2.5-flash-lite`
- **THEN** unverified or removed models (`gemini-3.7-flash`, `gemini-2.5-pro`, `gemini-3.1-pro`, `gemini-3.6-flash`) are not present in `AVAILABLE_MODELS`

#### Scenario: Default Model Selection
- **WHEN** a chat request arrives without an explicit model selection or with an unrecognized or deprecated model (such as `google-antigravity/gemini-3.7-flash`)
- **THEN** the service defaults to `google-antigravity/gemini-3.8-flash` with provider `omp`

#### Scenario: Upstream Gateway Unknown Model Fallback
- **WHEN** a chat request specifies a model that is rejected by the upstream gateway with an unknown model error
- **THEN** the agent service falls back to `google-antigravity/gemini-3.8-flash` or emits a descriptive SSE error event instead of a masked `3:"An error occurred."`
