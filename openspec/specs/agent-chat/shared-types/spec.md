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

### Requirement: Shared Model Definitions
The shared types package SHALL define `DEFAULT_MODELS` as a list of all 12 google-antigravity Gemini models matching the backend `AVAILABLE_MODELS` list.

#### Scenario: DEFAULT_MODELS Completeness
- **WHEN** consumer imports `DEFAULT_MODELS` from `@maniyy/shared`
- **THEN** the array contains exactly 12 entries, one for each google-antigravity Gemini model: `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-2.5-pro`, `gemini-3-flash`, `gemini-3-pro`, `gemini-3.1-flash-lite`, `gemini-3.1-pro`, `gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-3.6-flash`, `gemini-3.7-flash`, `gemini-3.8-flash`
- **THEN** each entry has `provider: 'omp'`, a `displayName`, `capabilities`, and `thinkingLevels` consistent with the backend model configuration

#### Scenario: ModelProvider Type
- **WHEN** consumer imports `ModelProvider` from `@maniyy/shared`
- **THEN** the type includes `'omp'` as a valid provider value
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

### Requirement: OMP Provider and Curated Model Definitions

The shared types package SHALL include `'omp'` in the `ModelProvider` type union and export `DEFAULT_MODELS` containing exclusively the 4 curated OMP models: `google-antigravity/gemini-3.1-flash-lite`, `google-antigravity/gemini-3.7-flash`, `google-antigravity/gemini-3.8-flash`, and `opencode-zen/muse-spark-1.3-contributor-free`.

#### Scenario: Shared package exports OMP provider type
- **WHEN** consumer imports `ModelProvider` from `@maniyy/shared`
- **THEN** `'omp'` is accepted as a valid provider string alongside legacy providers

#### Scenario: Default models array verification
- **WHEN** consumer imports `DEFAULT_MODELS` from `@maniyy/shared`
- **THEN** the array contains exactly 4 models, with provider set to `'omp'`, and Google models configured with `thinking: true`


### Requirement: Thinking Text Field in ChatMessage
The shared types package SHALL define a field for model thinking/reasoning text on assistant messages.

#### Scenario: ChatMessage Thinking Field
- **WHEN** consumer imports `ChatMessage` from `@maniyy/shared`
- **THEN** the interface includes `thinking?: string` (accumulated reasoning text from model thinking output)

### Requirement: Credit System Types
The shared types package SHALL define types for credit balance, transactions, and pricing used across frontend and backend.

#### Scenario: Credit Balance Type
- **WHEN** consumer imports `CreditBalance` from `@maniyy/shared`
- **THEN** the interface defines: `balance: number`, `lifetimeUsed: number`, `defaultBalance: number`, `creditValueUsd: number`

#### Scenario: Credit Transaction Type
- **WHEN** consumer imports `CreditTransaction` from `@maniyy/shared`
- **THEN** the interface defines: `id: string`, `model: string`, `inputTokens: number`, `outputTokens: number`, `creditsUsed: number`, `conversationId: string`, `createdAt: number`

#### Scenario: Credit Pricing Type
- **WHEN** consumer imports `CreditPricing` from `@maniyy/shared`
- **THEN** the interface defines: `model: string`, `inputPerMillion: number`, `outputPerMillion: number`

### Requirement: Context Usage Metadata Type
The shared types package SHALL define the context usage structure included in stream finish metadata.

#### Scenario: ContextUsage Type
- **WHEN** consumer imports `ContextUsage` from `@maniyy/shared`
- **THEN** the interface defines: `usedTokens: number`, `maxTokens: number`, `percentUsed: number`

### Requirement: Stream Finish Metadata Extension
The shared types package SHALL extend the stream finish metadata to include credit and context information.

#### Scenario: StreamFinishMetadata Type
- **WHEN** consumer imports `StreamFinishMetadata` from `@maniyy/shared`
- **THEN** the interface defines: `creditsUsed?: number`, `creditsRemaining?: number`, `contextUsage?: ContextUsage`

### Requirement: Updated Model Defaults
The shared types package SHALL reflect the removal of OpenCode and updated default models.

#### Scenario: ModelProvider Type Update
- **WHEN** consumer imports `ModelProvider` from `@maniyy/shared`
- **THEN** the type union is `'gemini' | 'groq' | 'omp'` (no `'opencode'`)

#### Scenario: DEFAULT_MODELS Update
- **WHEN** consumer imports `DEFAULT_MODELS` from `@maniyy/shared`
- **THEN** the array contains exactly 3 models: `google-antigravity/gemini-3.1-flash-lite`, `google-antigravity/gemini-3.7-flash`, `google-antigravity/gemini-3.8-flash`
- **THEN** no model with provider `opencode` or model ID containing `opencode-zen` or `muse-spark` is present

#### Scenario: AssistantVariant Thinking Field
- **WHEN** consumer imports `AssistantVariant` from `@maniyy/shared`
- **THEN** the interface includes `thinking?: string` alongside existing `content`, `toolInvocations`, `timestamp`, and `error` fields


### Requirement: Aligned Parameter and Entity Contracts
The shared types package SHALL define TypeScript interfaces for extended tool parameters and responses matching the Reedrich OpenAPI specification.

#### Scenario: Transaction Mutation Parameter Types
- **WHEN** consumer imports mutation parameter types
- **THEN** `CreateTransactionParams` and `UpdateTransactionParams` support `date` as ISO-8601 string, optional `transactionDate`, `adminFee`, and nullable `budgetId`
- **THEN** `CreateTransferParams` supports `categoryId` and `adminFee`

#### Scenario: Transaction Query Parameter Types
- **WHEN** consumer imports `ListTransactionsParams`
- **THEN** the interface includes optional `q?: string`, `type?: TransactionType`, `isPlanned?: boolean | number`, `budgetId?: string`, `targetWalletId?: string`, and `orderBy?: string`

#### Scenario: Apply Recurring Parameter Types
- **WHEN** consumer imports `ApplyRecurringParams`
- **THEN** the interface includes `templateId: string`, `transactionId?: string`, `executionDate?: string`, and `actualAmount?: number`
