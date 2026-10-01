# Spec Delta: agent-chat/frontend

## MODIFIED Requirements

### Requirement: Multi-Provider and Model Selection
The chat UI SHALL provide a model selector dropdown populated from the backend models list.

#### Scenario: Select Model for Conversation
- **WHEN** user opens the model selector dropdown in the chat header
- **THEN** available active models from Gemini and Groq are displayed with their providers and capability badges
- **THEN** selecting a model updates the active conversation configuration and persists the choice for subsequent messages

#### Scenario: Display Updated OpenCode Models in Model Picker
- **WHEN** user opens the model picker dropdown in the chat interface
- **THEN** non-functional OpenCode Zen models are not presented to prevent user-facing stream crashes
- **THEN** active model switching cleanly selects between Google Gemini and Groq models
