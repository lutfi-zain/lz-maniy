## MODIFIED Requirements

### Requirement: Statement Import Shared Types

The shared types package SHALL define statement import types (`StatementRow`, `StatementSession`, `StatementParseResult`, and the chat request session reference) with zero runtime dependencies.

#### Scenario: Statement row shape is stable for agent and UI
- **WHEN** backend parse results and frontend draft rendering consume statement rows
- **THEN** both use the shared `StatementRow` shape (`date`, `description`, `amount`, `direction`, plus optional `page` and `rawText`)
- **THEN** session references in chat requests use the shared session-reference type carrying only `sessionId`

#### Scenario: Parse result carries per-file status
- **WHEN** a bulk parse completes with mixed success
- **THEN** the shared `StatementParseResult` shape reports per-file status (`ready` or `error` with reason) plus session totals
