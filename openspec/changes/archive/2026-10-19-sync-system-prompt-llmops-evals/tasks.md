## 1. Prompt File Synchronization

- [x] 1.1 Update `apps/agent/eval/prompts/system-baseline.txt` with the 1:1 canonical production prompt containing the Intent-to-Tool Decision Matrix, $T=0/T<0/T+1/T>1\dots 24$ temporal routing, curiosity protocol, accounting invariants, and Markdown table output format.
- [x] 1.2 Update `apps/agent/eval/prompts/system-compact.txt` to condense instructions (<500 tokens) while preserving the temporal decision matrix and hard negative constraints.
- [x] 1.3 Update `apps/agent/eval/prompts/system-fewshot.txt` by adding a few-shot example demonstrating `horizon_projection` execution on multi-month horizon planning questions.

## 2. Arize Phoenix & Langfuse LLMOps Suite Synchronization
- [x] 2.1 Update `apps/agent/eval/phoenix-suite.ts` to tag the synchronized system prompt versions as `v1.15.0` with updated metadata.
- [x] 2.2 Update `apps/agent/eval/observability-sync.ts` with updated prompt metadata and commit audit descriptions.
- [x] 2.3 Execute `bun run --cwd apps/agent observability:sync` to push 100% synchronized prompts and assets to both Arize Phoenix and Langfuse Cloud.

## 3. Verification & CI/CD Validation

- [x] 3.1 Run full agent tests via `bun run test:agent` to prove zero regressions across all 29 test suites.
- [x] 3.2 Run workspace typecheck via `bun run check:web`.
- [x] 3.3 Run secret scan via `bun scripts/check-secrets.ts` and verify 0 findings.
