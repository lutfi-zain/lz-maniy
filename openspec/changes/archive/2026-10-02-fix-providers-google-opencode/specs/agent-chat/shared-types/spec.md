# Spec Delta: agent-chat/shared-types

## MODIFIED Requirements

### Requirement: Model Configuration and Provider Types
The shared types package SHALL define configurations and capability flags for AI model providers including thinking/reasoning and OpenCode.

#### Scenario: Model Config Structure
- **WHEN** consumer imports `ModelConfig` from `@maniyy/shared`
- **THEN** the interface provides:
  - `provider: 'gemini' | 'groq' | 'opencode'`
  - `model: string`
  - `displayName: string`
  - `capabilities: { vision: boolean; tool_calling: boolean }`

#### Scenario: Model Config Structure with Thinking Capabilities
- **WHEN** consumer imports `ModelConfig` from `@maniyy/shared`
- **THEN** the interface supports:
  - `provider: 'gemini' | 'groq' | 'opencode'`
  - `model: string`
  - `displayName: string`
  - `capabilities: { vision: boolean; tool_calling: boolean; thinking?: boolean }`
  - `thinkingLevels?: Array<'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'>`

#### Scenario: Agent Settings Structure
- **WHEN** consumer imports `AgentSettings` from `@maniyy/shared`
- **THEN** the interface defines `defaultProvider: 'gemini' | 'groq'`, `defaultModel: string`, and optional `systemPromptOverride?: string`

#### Scenario: OpenCode Model Definitions
- **WHEN** consumer imports `AVAILABLE_MODELS` from `@maniyy/shared`
- **THEN** non-functional upstream OpenCode models (`muse-spark-1.3-contributor-free`, `deepseek-v4-flash-free`) are omitted from active model choices
- **THEN** active entries prioritize verified Google Gemini and Groq models
