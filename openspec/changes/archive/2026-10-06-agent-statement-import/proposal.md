## Why

Users hold months of financial truth in bank statements (rekening koran / exported transaction PDFs) that the agent cannot see: chat attachments today accept images only, and pasting statement text into chat is impractical beyond a few rows. Parsing statements in the Worker into row-structured session artifacts lets the agent reason over real bank data, pull live context via existing tools, and propose transactions for user confirmation before recording.

## What Changes

- **Statement parse endpoint (Worker)**: Add `POST /api/statements/parse` accepting one or more PDF files (multipart, max 100 pages per file) and returning row-structured results `{ sessionId, files: [{ fileName, pageCount, rowCount, bank?, period? }], rows }` where each row is `{ date, description, amount, direction }`. Raw PDF bytes are never persisted; only parsed rows land in KV with TTL.
- **Session artifacts in KV**: Store parsed rows per `sessionId` with TTL expiry. Chat history keeps only the session reference and summary, never raw rows.
- **Agent tool `get_statement_rows`**: New tool letting the agent fetch statement rows by `sessionId` with `{ page, pageSize, q }` filters during the agent loop, mirroring how `list_transactions` works today.
- **Chat attach + confirm-commit flow**: Frontend adds PDF attach (bulk, with per-file parse status); the statement session attaches to the chat request; the agent produces insight, pulls live context via existing financial/wallet tools, presents draft transactions, and records only after explicit user confirmation via existing `create_transaction` / `create_transfer` tools.
- **Limits & chunking**: Enforce per-file page cap (100), bulk queue (parse per file, one session), and row paging so large statements never flood the context window. Surface parse cost awareness before sending.

## Capabilities

### New Capabilities
- None (all behavior extends existing capabilities).

### Modified Capabilities
- `agent-chat/backend`: (`openspec/specs/agent-chat/backend/spec.md`) Add statement parse endpoint, KV session artifacts with TTL, and `get_statement_rows` agent tool.
- `agent-chat/frontend`: (`openspec/specs/agent-chat/frontend/spec.md`) Add PDF attach with bulk queue, parse status, and statement-aware confirm-commit flow.
- `agent-chat/shared-types`: (`openspec/specs/agent-chat/shared-types/spec.md`) Add `StatementRow`, `StatementSession`, `StatementParseResult`, and chat request session reference types.

## Impact

- **Non-Goals**:
  - Automatic bulk commit without user confirmation; every recording still requires explicit confirm per existing mutation tool contracts.
  - Per-bank perfect parsers; the Worker stops at row segmentation (`date/description/amount/direction`), format reasoning stays with the LLM.
  - Duplicate detection across statement and ledger; out of scope (agent may warn heuristically, no auto-dedup).
  - Password-protected (PIN) PDFs; rejected with a clear error in this change.
  - Scanned/image-only PDFs requiring OCR; rejected with a clear error in this change.
- **Breaking Changes**: None. Additive endpoint, tool, and types; existing chat contract unchanged.
- **Dependencies**: Worker needs a PDF text-extraction library ( evaluations: `unpdf` / `pdf-parse` under Workers CPU limits); KV `CONFIG` binding reuse for session artifacts. No D1 schema changes.
