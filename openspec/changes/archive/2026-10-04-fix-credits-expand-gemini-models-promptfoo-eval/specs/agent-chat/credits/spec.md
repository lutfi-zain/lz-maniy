# Spec Delta

## CHANGED Requirements

### Requirement: Credit Metadata in Stream Response (CHANGED)
The credit system SHALL include credit usage and remaining balance information in the stream finish metadata for ALL provider paths (Gemini native runner AND AI SDK path).

#### Scenario: Credits in Gemini Native Runner Finish Event
- **WHEN** a Gemini native runner streaming response completes successfully
- **THEN** the `d:` SSE finish event includes `creditsUsed` (REAL, this turn's cost) and `creditsRemaining` (REAL, balance after deduction) computed from actual `usageMetadata.promptTokenCount` and `usageMetadata.candidatesTokenCount` reported by the Gemini API
- **THEN** hardcoded placeholder token counts (`promptTokens:100,completionTokens:100`) are NOT used

#### Scenario: Credits in AI SDK Path Finish Event
- **WHEN** an AI SDK streaming response completes via `onFinish`
- **THEN** the custom `d:` finish metadata injected into the stream includes `creditsUsed` and `creditsRemaining` alongside the standard `finishReason` and `usage`

### Requirement: Frontend Credit Balance Refresh (ADDED)
The frontend SHALL refresh the credit balance after each completed chat stream, regardless of whether the `d:` event contains credit data.

#### Scenario: Post-Stream Credit Refetch
- **WHEN** a chat stream completes (success or error) and the SSE connection closes
- **THEN** the frontend calls `GET /api/credits` to refresh `creditsRemaining` from the server
- **THEN** `CreditIndicator` reflects the updated balance within 2 seconds of stream end

#### Scenario: SSE Credit Data Takes Priority
- **WHEN** the `d:` finish event includes `creditsRemaining`
- **THEN** the frontend applies this value immediately and skips the redundant refetch
