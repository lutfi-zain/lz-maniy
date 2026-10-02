# Spec Delta

## MODIFIED Requirements

### Requirement: Integration Testing Infrastructure with Workers Pool

The repository SHALL support isolated integration testing of Worker endpoints and database operations without live external credentials. Explicit live financial checks and evaluation runners SHALL use private runtime credentials and the authorized dedicated-test account, never embedded examples or personal-account fallbacks.

#### Scenario: Worker Integration Test Execution
- **WHEN** the agent integration tests execute in the configured Workers pool
- **THEN** they use an isolated database and mocked external financial/model endpoints
- **AND** authenticated endpoint behavior is verified without relying on live external networks or interpreting mocks as live financial-value evidence.

#### Scenario: Dedicated Test Account Configuration
- **WHEN** explicitly authorized end-to-end smoke verification targets a staging or live financial endpoint
- **THEN** the test uses private runtime `REEDRICH_TEST_API_TOKEN`, the expected `REEDRICH_TEST_USER_ID`, and approved target/destructive-run configuration
- **AND** authenticated identity must match the dedicated account before financial mutation or cleanup
- **AND** no real credential example or personal-account fallback is committed or uploaded.

#### Scenario: Evaluation Runner Configuration
- **WHEN** an evaluation requires a financial token or a selected model-provider key
- **THEN** required credentials come from private runtime variables such as `GEMINI_API_KEY` or `GROQ_API_KEY` for the selected provider
- **AND** missing configuration fails before network access with redacted errors and no embedded fallback.
