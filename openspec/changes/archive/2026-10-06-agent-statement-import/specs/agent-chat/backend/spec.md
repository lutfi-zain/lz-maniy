## MODIFIED Requirements

### Requirement: Statement Parse Endpoint and Session Artifacts

The agent service SHALL expose a statement parse endpoint accepting bank statement PDF files and returning row-structured results stored as TTL session artifacts, with raw PDF bytes never persisted.

#### Scenario: Parse single statement PDF into rows
- **WHEN** a client submits one PDF file (text-based, within page cap) to the parse endpoint
- **THEN** the service returns a `sessionId` plus per-file metadata (`fileName`, `pageCount`, `rowCount`, detected `bank`/`period` when identifiable) and row data (`date`, `description`, `amount`, `direction`)
- **THEN** raw PDF bytes are discarded after parsing and never written to D1 or KV

#### Scenario: Bulk upload parses per file into one session
- **WHEN** a client submits multiple PDF files in one request
- **THEN** each file is parsed independently with per-file status, and all rows join a single `sessionId`
- **THEN** a file that fails (unreadable, over page cap) reports its own error without failing the other files

#### Scenario: Reject oversized statements
- **WHEN** a submitted file exceeds 100 pages
- **THEN** the service rejects that file with a page-cap error naming the limit

#### Scenario: Reject password-protected PDFs
- **WHEN** a submitted PDF requires a password or PIN
- **THEN** the service rejects it with a clear error and never stores the file

#### Scenario: Reject scanned PDFs without text layer
- **WHEN** a submitted PDF has no extractable text layer
- **THEN** the service rejects it with a clear error directing the user to a text-based export

#### Scenario: Session artifacts expire via TTL
- **WHEN** a statement session is created
- **THEN** parsed rows are stored under `sessionId` with a TTL expiry
- **THEN** after expiry the rows are gone while conversation history (references and summaries) remains intact

### Requirement: Statement Rows Agent Tool

The agent service SHALL provide a `get_statement_rows` tool letting the model fetch parsed statement rows by `sessionId` with pagination and search during the agent loop.

#### Scenario: Agent pages statement rows
- **WHEN** the model calls `get_statement_rows` with a valid `sessionId`, `page`, and `pageSize`
- **THEN** the service returns that row window plus total count, scoped to the authenticated user

#### Scenario: Agent searches statement rows
- **WHEN** the model calls `get_statement_rows` with a `q` filter
- **THEN** the service returns only rows matching description or amount text

#### Scenario: Expired session returns a clear error
- **WHEN** the model calls `get_statement_rows` with an expired or unknown `sessionId`
- **THEN** the service returns an error directing the agent to ask the user to re-upload

### Requirement: Confirmation Gate for Statement Recording

Statement-derived transaction recording SHALL follow the existing mutation confirmation gate: the agent presents drafts and records only after explicit user confirmation via existing mutation tools.

#### Scenario: Agent presents drafts before recording
- **WHEN** the agent proposes recording statement rows as transactions
- **THEN** it presents the draft rows (date, description, amount, direction, target wallet) for user review first
- **THEN** no `create_transaction` or `create_transfer` call is made before the user confirms
