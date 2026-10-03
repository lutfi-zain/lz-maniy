# Spec Delta

## ADDED Requirements

### Requirement: OMP Gateway Model Picker Presentation

The web client model picker component SHALL group models into "Google Antigravity" and "OpenCode Zen" categories, displaying appropriate iconography (Sparkle for Google Antigravity, Brain/Lightning for OpenCode) and showing reasoning capability badges.

#### Scenario: Dropdown rendering with OMP models
- **WHEN** user clicks the model selector dropdown in the chat header
- **THEN** the dropdown displays Google Antigravity models under a distinct heading and OpenCode models under an OpenCode Zen heading
- **THEN** models with `capabilities.thinking: true` display a subtle "Reasoning supported" indicator

#### Scenario: Thinking Level Control Visibility
- **WHEN** user selects a Google Antigravity Gemini model with thinking support
- **THEN** the thinking level selector button appears alongside the model picker allowing selection between `off`, `low`, `medium`, and `high`
- **WHEN** user selects an OpenCode model without thinking support
- **THEN** the thinking level selector is hidden
