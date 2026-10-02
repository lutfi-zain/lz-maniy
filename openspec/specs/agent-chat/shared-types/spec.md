# agent-chat/shared-types Specification

## Purpose
Shared TypeScript contracts, data models, and payload types shared across the SvelteKit frontend web client (`apps/web`) and the Cloudflare Worker agent backend (`apps/agent`) with zero runtime dependencies.

## Requirements

### Requirement: Page Context Contract
The shared types package SHALL define the `PageContext` type capturing the complete user interface state for agent awareness.

#### Scenario: Page Context Structure
- **WHEN** consumer imports `PageContext` from `@maniyy/shared`
- **THEN** the type specifies:
  - `route: string` (current application path)
  - `activeTab?: string` (active cockpit/studio tab)
  - `selectedInstitution?: string` (currently filtered bank/e-wallet institution)
  - `dateFilter?: { start: string; end: string }` (active date range)
  - `visibleWallets?: Array<{ walletId: string; walletName: string; balance: number }>` (visible wallet items)
  - `activeDrawer?: { type: DrawerType; isOpen: boolean }` (drawer visibility state)

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

### Requirement: UI Command Protocol Types
The shared types package SHALL define the discriminated union for `UICommand` payloads returned by the agent.

#### Scenario: UI Command Types and Actions
- **WHEN** consumer imports `UICommand` from `@maniyy/shared`
- **THEN** the type is a discriminated union with `type: 'ui_command'` and `command`:
  - `'navigate'`: payload `{ route: string }`
  - `'filter'`: payload `{ institution?: string; walletId?: string }`
  - `'tab'`: payload `{ tab: string }`
  - `'date_range'`: payload `{ start: string; end: string }`
  - `'drawer'`: payload `{ drawerState: DrawerState }`
  - `'transaction_form'`: payload `{ mode: 'create' | 'edit'; formData?: Partial<CreateTransactionPayload> }`
  - `'focus'`: payload `{ selector: string }`

### Requirement: Conversation Metadata and Management Types
The shared types package SHALL define structures for conversation listing, export, and import.

#### Scenario: Conversation Metadata Definition
- **WHEN** consumer imports `ConversationMeta` from `@maniyy/shared`
- **THEN** the interface contains `id: string`, `title: string`, `model: string`, `provider: 'gemini' | 'groq'`, `createdAt: number`, `updatedAt: number`, and `messageCount: number`

#### Scenario: Export and Import Payload Bundles
- **WHEN** consumer imports `ConversationExportBundle` from `@maniyy/shared`
- **THEN** the interface includes `version: string`, `exportedAt: number`, `conversations: Array<ConversationMeta & { messages: ChatMessage[] }>`

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

### Requirement: Re-Export of Core Domain Types
The shared types package SHALL re-export all core Reedrich financial entity and DTO types.

#### Scenario: Core Domain Exports
- **WHEN** consumers import domain types from `@maniyy/shared`
- **THEN** the package provides `UserProfileDTO`, `TransactionType`, `WalletItem`, `AccountDetail`, `TransactionRecord`, `CreateTransactionPayload`, `CreateTransferPayload`, `UpdateTransactionPayload`, `CategoryRecord`, `DrawerType`, and `DrawerState` without requiring import from application-specific paths

### Requirement: Zero Runtime Dependency Guarantee
The shared package SHALL contain zero external runtime dependencies and build as pure TypeScript declarations.

#### Scenario: Dependency Verification
- **WHEN** `@maniyy/shared` package is inspected
- **THEN** its `package.json` contains no runtime `dependencies`, only `devDependencies` for TypeScript compilation and validation

### Requirement: Thinking Level and Stream Request Configuration
The shared types package SHALL define request parameters for selecting thinking effort levels during streaming generation.

#### Scenario: Stream Request with Thinking Level
- **WHEN** consumer constructs a `ChatStreamRequest`
- **THEN** the payload accepts an optional `thinkingLevel?: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'`
- **THEN** the payload accepts `model?: { provider: 'gemini' | 'groq' | 'opencode'; model: string }`

### Requirement: Curated Model Configuration Types

The shared types package SHALL define `AVAILABLE_MODELS` as a curated list of exactly 6 models: `gemini-3.1-flash-lite`, `gemini-3.7-flash`, `gemini-3.8-flash`, `gemini-3.1-pro-preview`, `groq/openai/gpt-oss-20b`, and `groq/openai/gpt-oss-120b`. The `DEFAULT_MODELS` fallback list SHALL be a subset matching the curated backend list.

#### Scenario: Shared package exports curated model list

- **WHEN** a consumer imports `DEFAULT_MODELS` from `@maniyy/shared`
- **THEN** the list contains no superseded models (3.5, 3.6, flash-lite-latest) and no niche models (qwen3.8-27b)

### Requirement: Extended Financial Tool Parameter and Result Types

The shared types package SHALL define TypeScript types for all new tool parameters and results: `WalletCreateParams`, `WalletUpdateParams`, `BudgetParams`, `DebtLoanParams`, `DebtLoanRepayParams`, `GoalParams`, `GoalWalletLinkParams`, `RecurringTemplateParams`, `FeedbackParams`, `HorizonParams`, and their corresponding response types matching the Reedrich REST API v1.17.0 OpenAPI schema.

#### Scenario: New tool types are importable

- **WHEN** the agent backend imports wallet/budget/goal parameter types from `@maniyy/shared`
- **THEN** TypeScript compilation succeeds with strict type checking and the types match the Reedrich OpenAPI schema

### Requirement: Agent Memory Type Definition

The shared types package SHALL define an `AgentMemory` interface containing: `walletNicknames` (map of walletId to human nickname), `cashflowPattern` (string description of user's money flow), `formattingPreferences` (array of formatting directives), and `customContext` (freeform string for user-specific financial context such as recurring obligations, family members, account numbers).

#### Scenario: Agent memory type is used in system prompt builder

- **WHEN** the system prompt builder receives an `AgentMemory` object
- **THEN** it can access all fields without type errors and inject them into the dynamic prompt sections
