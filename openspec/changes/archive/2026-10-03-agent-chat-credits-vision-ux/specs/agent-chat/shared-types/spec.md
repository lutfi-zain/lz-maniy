# Spec Delta

## ADDED Requirements

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
