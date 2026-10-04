# Spec Delta

## CHANGED Requirements

### Requirement: Post-Stream Credit Balance Refresh (ADDED)
The chat frontend SHALL refresh the credit balance display after each completed chat stream.

#### Scenario: Automatic Refetch After Stream End
- **WHEN** a chat SSE stream closes (regardless of success or error)
- **THEN** the chat store calls `loadCredits()` to fetch the latest balance from `GET /api/credits`
- **THEN** `CreditIndicator` updates to reflect the post-deduction balance

#### Scenario: Immediate Update from SSE Data
- **WHEN** the `d:` finish SSE event contains `creditsRemaining` and `creditsUsed`
- **THEN** the chat store applies these values immediately without waiting for the refetch
- **THEN** the refetch is skipped if `creditsRemaining` was already received from SSE

### Requirement: Expanded Model Picker (CHANGED)
The chat model picker SHALL display all 12 Gemini models available from the backend.

#### Scenario: Model Picker List Source
- **WHEN** the chat panel opens and the model picker is rendered
- **THEN** it fetches models from `GET /api/models` and displays all returned models
- **THEN** the picker groups models by tier (Lite, Flash, Pro) for visual organization

#### Scenario: Model Picker Selection Persistence
- **WHEN** the user selects a new model from the expanded list
- **THEN** the selection persists across page navigation and browser refresh via localStorage
