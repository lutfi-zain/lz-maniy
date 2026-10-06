## Context

See `proposal.md` — Why for background and motivation.

Current implementation status (all verified by code inspection):
1. Chat attachments accept images only: `ChatInput.svelte` stages `{data, mimeType, previewUrl}` via `FileReader`, sends via `sendMessage(text, img)`, and `chat.ts` maps it to a vision content part. D1 persists only `imageRef: 'ephemeral-image'`, never base64.
2. Tool factories follow one pattern: `createXTools(...)` returning `ai` `tool()` records with zod params, spread-merged in both `gemini-native.ts` (native runner) and `routes/chat.ts` (AI SDK path). Any new tool must register in both.
3. KV `CONFIG` binding exists in `Env` and `wrangler.toml` but is currently unused by chat code — available for TTL session artifacts with no new bindings.
4. Mutation tools (`create_transaction`, `create_transfer`) already contractually require user confirmation ("Selalu konfirmasi detail sebelum memanggil ini"); the system prompt has a Confirmation Gate requirement. Statement recording reuses this gate, no new commit path.
5. `ChatStreamRequest` carries a single optional `image`; statement sessions need a parallel optional session reference, not a reuse of the image field.

## Goals / Non-Goals

**Goals:**
- Worker-side PDF text extraction with row segmentation, per-file status, and KV TTL artifacts.
- Agent-side paged row access via a first-class tool in both runners.
- Frontend bulk attach with parse status and session-referenced chat requests.
- Shared types with zero runtime deps.

**Non-Goals:**
- OCR, password-protected PDFs, per-bank perfect parsers, auto-dedup, auto-commit (all per proposal Non-Goals).

## Decisions

### Decision 1: Dedicated multipart parse endpoint, not the image field
- **Choice**: New `POST /api/statements/parse` (auth-guarded like `/api/chat`) accepting `multipart/form-data` with one or more PDFs. Returns `{ sessionId, files[], totals }` JSON. The chat request gains an optional `statementSessionId`, resolved server-side to a summary injected into context — raw rows never ride the chat JSON.
- **Rationale**: Base64 PDFs in chat JSON would explode payload size and context; the image path works only because images go straight to vision. Structured rows deserve structured handling. Mirrors the `imageRef` ephemeral philosophy: bytes transient, reference durable.
- **Alternatives Considered**:
  - *Reuse `image` field with `application/pdf` mime*: rejected; vision content parts are not row data, and single-attachment shape cannot express bulk per-file status.

### Decision 2: Worker-side extraction with a CPU-capped library
- **Choice**: Extract text in the Worker using a bundlable pure-JS PDF parser evaluated against Workers CPU limits (candidates: `unpdf`, `pdf-parse` ESM builds). Segment into rows heuristically (date/amount line detection); bank/format reasoning stays with the LLM. Cap 100 pages per file; reject scanned (no text layer) and encrypted PDFs with typed errors.
- **Rationale**: Keeps orchestration in the agent (no FE overfit), one code path for all models including non-vision, and no web-bundle bloat. Page cap bounds CPU time per request.
- **Alternatives Considered**:
  - *Browser-side pdf.js*: rejected for this change; heavier client, inconsistent mobile behavior, and splits extraction logic across two runtimes.

### Decision 3: KV session artifacts keyed by user, paged tool access
- **Choice**: Store rows at `stmt:{userId}:{sessionId}` in the existing `CONFIG` KV with TTL (default 24h). `get_statement_rows({sessionId, page, pageSize, q})` reads KV server-side, enforces `userId` prefix ownership, and returns a window plus totals. Registered in both `gemini-native.ts` and `routes/chat.ts` tool maps, plus Gemini declarations parity.
- **Rationale**: Follows the `createMemoryTools(db, userId)` precedent (user-scoped server tool) and keeps 100-page statements out of the prompt — the agent pages what it needs, like `list_transactions` today.
- **Alternatives Considered**:
  - *Paste all rows into the first message*: rejected; floods context, breaks compaction economics, and duplicates what paging already solves.

### Decision 4: Confirm-commit reuses existing mutation tools unchanged
- **Choice**: No new recording tool. The agent presents draft rows (date/description/amount/direction/target wallet) in chat text, waits for explicit user confirmation, then calls existing `create_transaction`/`create_transfer`. System prompt gains a short statement-flow section pointing at the existing Confirmation Gate.
- **Rationale**: Smallest trust surface; the confirmation contract is already specified, tested, and understood. Bulk auto-commit would need a new trust model — explicitly out of scope.

## Risks / Trade-offs

- [PDF parser CPU overrun on dense 100-page files] → Mitigation: page cap + per-file isolation (one slow file does not block others); evaluate library CPU under `vitest-pool-workers` before locking choice.
- [Row segmentation misreads a bank format] → Mitigation: segments are heuristic by design; the agent cross-checks via tools and the user confirms before anything is recorded. No silent commit path exists.
- [KV value size limits on huge sessions] → Mitigation: shard rows per file (`stmt:{userId}:{sessionId}:{fileIdx}`) with a manifest key; tool reassembles windows across shards.
- [Credit burn on large statements] → Mitigation: frontend surfaces files/pages/rows before send; paging keeps per-turn tokens bounded; existing credit pre-check still gates.
- [Statement data in KV is sensitive PII] → Mitigation: userId-prefixed keys, auth-guarded endpoints and tool (server-side userId, never client-supplied), short TTL, no D1 persistence, no log of row contents.

## Test Strategy

- **Unit (Vitest, workers pool)**: row segmentation fixtures from anonymized bank exports (2+ bank formats); `get_statement_rows` paging/search/ownership/TTL-miss cases; parse rejection cases (over-cap, encrypted, scanned).
- **Contract**: shared-types build with zero runtime deps; parse result shape asserted on both sides.
- **E2E (Playwright)**: attach → parse status → send → agent draft → confirm → recorded transaction appears in ledger. Verifies both desktop and mobile viewports per project guidance.
