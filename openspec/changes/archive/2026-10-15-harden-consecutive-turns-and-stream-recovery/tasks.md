## 1. Multi-Turn History Sanitization

- [x] 1.1 Implement `sanitizeHistoryForModel` helper with comprehensive unit tests validating that consecutive duplicate roles are collapsed and trailing unresponded user turns are pruned from the model payload while preserving database records intact. (Verify: `bun test apps/agent/src/__tests__/unit/consecutive-turns.test.ts`)
- [x] 1.2 Integrate `sanitizeHistoryForModel` into `apps/agent/src/routes/chat.ts` when resolving `priorMessages` for `streamText` to guarantee Gemini role alternation invariants (`user` $\rightarrow$ `assistant` $\rightarrow$ `user`). (Verify: `bun run test:agent`)

## 2. Real-Time Tool Capture & Defensive Stream Recovery

- [x] 2.1 Extend `wrapToolsWithTracing` in `apps/agent/src/observability/instrument-tools.ts` with `onToolResult` hook to notify callers immediately upon successful tool resolution. (Verify: `bun test apps/agent/src/agent/tools/__tests__/tools.test.ts`)
- [x] 2.2 Wire `capturedToolResults` in `apps/agent/src/routes/chat.ts` via the real-time `onToolResult` callback and ensure `attemptFallbackSynthesis` triggers seamlessly on stream error lines (`3:`) and exception catch blocks. (Verify: `bun test apps/agent/src/__tests__/unit/stream-recovery.test.ts`)

## 3. Verification & Deployment

- [x] 3.1 Run full agent unit test suite (`bun run test:agent`), web type checking (`bun run check:web`), and security secret scans (`bun scripts/check-secrets.ts`). (Verify: 100% tests pass, 0 type errors, 0 secret findings)
- [x] 3.2 Deploy updated `maniy-agent` worker to Cloudflare Workers and verify live health endpoint and model route. (Verify: `cd apps/agent && bunx wrangler deploy && curl -i https://maniy-agent.lutfidmz.workers.dev/`)
