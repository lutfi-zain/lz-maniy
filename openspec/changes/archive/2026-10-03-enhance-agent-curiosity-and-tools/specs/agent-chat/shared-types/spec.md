# Spec Delta

## ADDED Requirements

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
