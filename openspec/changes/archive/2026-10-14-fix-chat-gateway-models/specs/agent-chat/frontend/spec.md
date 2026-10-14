## MODIFIED Requirements

### Requirement: Default Model Selection and Alignment
The chat frontend store SHALL default to `google-antigravity/gemini-3.8-flash` on initial load and when clearing or creating a new conversation.

#### Scenario: Initial Chat Store Model
- **WHEN** the chat store is initialized
- **THEN** `selectedModel` is set to `google-antigravity/gemini-3.8-flash` with provider `omp`

#### Scenario: Available Models Population
- **WHEN** the chat store loads available models
- **THEN** the active model list only includes verified models matching the backend `AVAILABLE_MODELS`
- **THEN** deprecated model identifiers (`gemini-3.7-flash`) are omitted from the model selector options
