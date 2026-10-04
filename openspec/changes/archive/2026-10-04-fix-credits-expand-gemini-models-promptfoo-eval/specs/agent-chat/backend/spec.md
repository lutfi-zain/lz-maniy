# Spec Delta

## CHANGED Requirements

### Requirement: Multi-Provider Model Selection (CHANGED)
The agent service SHALL expose all 12 google-antigravity Gemini models available via the OMP gateway, replacing the current curated list of 3.

#### Scenario: Expanded Gemini Model List
- **WHEN** `AVAILABLE_MODELS` is evaluated
- **THEN** it contains all 12 google-antigravity Gemini models: `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-2.5-pro`, `gemini-3-flash`, `gemini-3-pro`, `gemini-3.1-flash-lite`, `gemini-3.1-pro`, `gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-3.6-flash`, `gemini-3.7-flash`, `gemini-3.8-flash`
- **THEN** each model entry specifies `provider: 'omp'`, the full `google-antigravity/<model>` model ID, a human-readable `displayName`, and accurate `capabilities` (vision, tool_calling, thinking)

#### Scenario: Thinking Level Configuration per Model
- **WHEN** a model supports thinking (all 12 do)
- **THEN** its `thinkingLevels` array reflects the actual levels supported by the OMP gateway for that model (e.g. `['off', 'minimal', 'low', 'medium', 'high']` for flash models, `['off', 'low', 'high']` for pro models)

#### Scenario: Default Model Unchanged
- **WHEN** no model is specified in the chat request
- **THEN** the service defaults to `google-antigravity/gemini-3.7-flash`

### Requirement: Gemini Native Runner Actual Token Usage (CHANGED)
The Gemini native runner SHALL use actual token counts from the Gemini API `usageMetadata` instead of hardcoded placeholder values.

#### Scenario: Real Token Counts in Stream Metadata
- **WHEN** the Gemini native runner completes a response (with or without tool calls)
- **THEN** the `e:` and `d:` SSE events contain `promptTokens` and `completionTokens` derived from `response.usageMetadata.promptTokenCount` and `response.usageMetadata.candidatesTokenCount`
- **THEN** if `usageMetadata` is unavailable, the runner falls back to estimation (word-count * 1.3) rather than hardcoded 100/100

#### Scenario: Token Counts Accumulate Across Tool Loops
- **WHEN** the Gemini runner executes multiple tool-call loops before producing a final text response
- **THEN** the reported token counts reflect the cumulative usage across all loops, not just the final response
