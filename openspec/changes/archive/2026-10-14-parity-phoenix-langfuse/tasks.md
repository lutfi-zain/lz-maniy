## 1. Live Runtime Session & User Parity

- [x] 1.1 In `apps/agent/src/routes/chat.ts`, set `user.id` on `tracer.rootSpan` immediately after auth verification, and set `session.id` and `conversation.id` on `tracer.rootSpan` once `activeConvId` is resolved.
- [x] 1.2 In `apps/agent/src/observability/tracer.ts`, update `WorkerSpan.setAttribute` to enforce bidirectional aliasing so setting `conversation.id` or `session.id` automatically populates `session.id`, `conversation.id`, and `langfuse.session.id`.

## 2. Asset Synchronization Suite (Prompts & Golden Dataset)

- [x] 2.1 Implement `apps/agent/eval/observability-sync.ts` with dual-sync logic uploading prompt templates (`system-baseline.txt`, `system-compact.txt`, `system-fewshot.txt`) to both Phoenix Prompt Hub and Langfuse Prompt Management.
- [x] 2.2 Add dataset synchronization logic in `observability-sync.ts` mirroring all 16 test cases from `EVAL_DATASET` (`apps/agent/eval/dataset.ts`) into Phoenix Datasets and Langfuse Datasets under `maniyy-agent-golden-dataset`.
- [x] 2.3 Add npm script `"observability:sync": "bun run eval/observability-sync.ts"` in `apps/agent/package.json`.

## 3. Test Suite, Verification & Secret Hygiene

- [x] 3.1 Add unit tests in `apps/agent/src/observability/__tests__/tracer.test.ts` asserting that `WorkerSpan` and `rootSpan` maintain lockstep parity for `session.id`, `conversation.id`, and `user.id`.
- [x] 3.2 Execute unit test suite with `bun run test:agent` to ensure all tests pass.
- [x] 3.3 Execute pre-commit secret scan `bun scripts/check-secrets.ts` to verify zero credentials exist in tracked files.
