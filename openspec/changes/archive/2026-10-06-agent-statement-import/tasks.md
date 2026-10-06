## 1. Shared Types & Contracts

- [x] 1.1 Add `StatementRow`, `StatementSession`, `StatementParseResult`, and chat session-reference types to `packages/shared` with zero runtime dependencies.
- [x] 1.2 Verify shared package builds and type-checks cleanly via `bun run check:web`.

## 2. Worker Parse Endpoint & Session Artifacts

- [x] 2.1 Evaluate PDF text-extraction libraries against Workers CPU limits and lock the choice (candidates: `unpdf`, ESM `pdf-parse` builds) under `vitest-pool-workers`.
- [x] 2.2 Implement row segmentation (`date/description/amount/direction`) with per-file status, 100-page cap, and typed rejections (encrypted, scanned, over-cap) plus anonymized fixtures from 2+ bank formats.
- [x] 2.3 Implement `POST /api/statements/parse` (multipart, bulk, auth-guarded) writing sharded rows to KV `CONFIG` under `stmt:{userId}:{sessionId}` with TTL; raw bytes never persisted.
- [x] 2.4 Add unit tests for segmentation fixtures, rejection cases, and KV TTL-miss behavior.

## 3. Agent Tool & Chat Flow

- [x] 3.1 Implement `get_statement_rows({sessionId, page, pageSize, q})` tool with server-side `userId` ownership enforcement, and register it in both `gemini-native.ts` and `routes/chat.ts` tool maps with Gemini declarations parity.
- [x] 3.2 Accept optional `statementSessionId` on the chat request, resolve it server-side to a summary injected into agent context, and extend the system prompt with the statement-flow section pointing at the existing Confirmation Gate.
- [x] 3.3 Add unit tests for tool paging/search/ownership and expired-session errors.

## 4. Frontend Attach & Confirm UI
- [x] 4.1 Add PDF attach control to `ChatInput` with bulk queue and per-file parse status (queued/parsing/ready/error with page and row counts), carrying only the session reference on send.
- [x] 4.2 Surface statement size (files/pages/rows) before sending for cost awareness, and render statement-aware draft/confirm states in chat.
- [x] 4.3 Add component render tests for attach queue states and session summary display.

## 5. Test Suites & Verification

- [x] 5.1 Run `bun run test:web` and `bun run test:agent` to ensure all unit tests pass without regressions.
- [x] 5.2 Run `bun run check:web` to confirm zero TypeScript or Svelte 5 compilation errors across the workspace.
- [x] 5.3 Run `bun scripts/check-secrets.ts` and `bun scripts/check-secrets.ts --history` to ensure no credentials or secrets were introduced.
- [x] 5.4 Execute the Playwright end-to-end journey (attach → parse status → send → agent draft → confirm → recorded transaction in ledger) on desktop and mobile viewports.
