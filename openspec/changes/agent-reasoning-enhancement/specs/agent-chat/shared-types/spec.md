# Spec Delta: agent-chat/shared-types

## MODIFIED Requirements

### Requirement: Chat Message and History Models
The shared types package SHALL define standard types for chat messages, roles, tool executions, and assistant response versioning.

#### Scenario: Chat Message Structure
- **WHEN** consumer imports `ChatMessage` from `@maniyy/shared`
- **THEN** the interface defines:
  - `id: string` (unique message UUID)
  - `conversationId: string` (parent conversation UUID)
  - `role: 'user' | 'assistant' | 'system' | 'tool'`
  - `content: string`
  - `toolCalls?: ToolCallPayload[]`
  - `toolResults?: ToolResultPayload[]`
  - `timestamp: number`
  - `imageRef?: string` (optional client cache identifier for images)

#### Scenario: Chat Message Structure with Response Variants
- **WHEN** consumer imports `ChatMessage` from `@maniyy/shared`
- **THEN** the interface defines:
  - `variants?: Array<{ content: string; toolInvocations?: ToolInvocationItem[]; timestamp: number; error?: string }>` (alternative assistant generations)
  - `activeVariantIndex?: number` (currently selected 0-based variant index)

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

## ADDED Requirements

### Requirement: Thinking Level and Stream Request Configuration
The shared types package SHALL define request parameters for selecting thinking effort levels during streaming generation.

#### Scenario: Stream Request with Thinking Level
- **WHEN** consumer constructs a `ChatStreamRequest`
- **THEN** the payload accepts an optional `thinkingLevel?: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'`
- **THEN** the payload accepts `model?: { provider: 'gemini' | 'groq' | 'opencode'; model: string }`
