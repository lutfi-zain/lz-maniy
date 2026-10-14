## ADDED Requirements

### Requirement: Dual-Export to Langfuse OTLP Endpoint
The observability framework SHALL transmit OpenTelemetry spans concurrently to Langfuse Cloud using OTLP Protobuf over HTTP as a secondary observability destination alongside Arize Phoenix.

#### Scenario: Successful concurrent export to Langfuse and Phoenix
- **WHEN** an HTTP request or evaluation run completes, and both Phoenix and Langfuse configurations are active
- **THEN** traces SHALL be serialized to Protobuf format and dispatched concurrently to both Phoenix and Langfuse endpoints
- **AND** the Langfuse HTTP request SHALL include `Authorization: Basic <base64-encoded-keys>` and `x-langfuse-ingestion-version: 4` headers.

#### Scenario: Isolated failure tolerance
- **WHEN** the Langfuse endpoint returns a non-200 HTTP response or experiences a network timeout
- **THEN** the failure SHALL be caught and logged as a warning
- **AND** it SHALL NOT abort the Phoenix trace export, throw an unhandled exception, or interrupt the user response stream.

### Requirement: Dynamic Environment Variable Toggle
The observability framework SHALL allow toggling Langfuse export on or off via environment variables without requiring code changes or application rebuilds.

#### Scenario: Langfuse disabled explicitly
- **WHEN** `LANGFUSE_ENABLED` is set to `"false"` in the execution environment
- **THEN** the framework SHALL NOT initiate any network requests to the Langfuse endpoint
- **AND** the application SHALL incur zero network latency overhead for Langfuse export.

#### Scenario: Langfuse disabled by missing credentials
- **WHEN** `LANGFUSE_PUBLIC_KEY` or `LANGFUSE_SECRET_KEY` is undefined or empty
- **THEN** the framework SHALL treat Langfuse export as disabled and bypass dispatch.

#### Scenario: Langfuse enabled
- **WHEN** both `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` are provided and `LANGFUSE_ENABLED` is not `"false"`
- **THEN** the framework SHALL automatically activate the secondary exporter.

### Requirement: Langfuse Context and Trace Correlation
The observability framework SHALL enrich root and nested spans with Langfuse-specific semantic attributes to enable session grouping and user drilldown in the Langfuse dashboard.

#### Scenario: User and conversation attribution
- **WHEN** an authenticated user initiates an agent chat turn
- **THEN** the root span and generation spans SHALL carry `langfuse.user.id` matching the authenticated `userId`
- **AND** they SHALL carry `langfuse.session.id` matching the active `conversationId`.

### Requirement: Zero-Secret Leakage and Credential Hygiene
The observability framework and associated deployment configurations SHALL strictly enforce zero hardcoded API keys or secret tokens in version-controlled files.

#### Scenario: Repository secret scan validation
- **WHEN** `bun scripts/check-secrets.ts` is executed against the working tree and staging area
- **THEN** zero occurrences of Langfuse secret keys (`sk-lf-*`) or raw authorization credentials SHALL be detected in tracked repository files.
