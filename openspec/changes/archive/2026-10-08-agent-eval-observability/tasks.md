## 1. Tracing Infrastructure & OTLP Exporter Setup

- [x] 1.1 Install `@opentelemetry/api` and `@opentelemetry/exporter-trace-otlp-http` in `apps/agent/package.json`.
- [x] 1.2 Implement worker-tailored OTLP HTTP tracer helper (`apps/agent/src/observability/tracer.ts`) with resource attributes (`service.name`, `deployment.environment`, `service.version`) and non-blocking background flush via `c.executionCtx.waitUntil`.
- [x] 1.3 Implement tracing middleware (`apps/agent/src/middleware/tracing.ts`) that extracts W3C `traceparent` headers from incoming requests and initializes root trace context.
- [x] 1.4 Add unit tests for tracer helper and header extraction in `apps/agent/src/observability/__tests__/tracer.test.ts`.

## 2. Hierarchical Span Instrumentation in Agent Route

- [x] 2.1 Instrument root HTTP request, auth verification, and credit pre-check child spans in `apps/agent/src/routes/chat.ts`.
- [x] 2.2 Instrument context retrieval spans for agent memory loading and statement session manifest fetching.
- [x] 2.3 Instrument Vercel AI SDK execution with step-level telemetry recording prompt/completion tokens, reasoning effort, TTFT, and latency.
- [x] 2.4 Instrument financial tool invocation spans in `apps/agent/src/agent/tools/` capturing sanitized inputs, tool name, and latency.
- [x] 2.5 Instrument credit settlement and message insertion spans recording calculated credits used and remaining balance.
- [x] 2.6 Add unit tests verifying span generation and error handling during tool failures in `apps/agent/src/__tests__/unit/tracing-route.test.ts`.

## 3. Frontend Context Propagation (Svelte 5)

- [x] 3.1 Update `apps/web/src/lib/stores/chat.svelte.ts` to generate W3C `traceparent` (`00-${traceId}-${spanId}-01`) and attach it to outgoing `POST /api/chat` requests.
- [x] 3.2 Add unit test in `apps/web/src/lib/stores/__tests__/chat-tracing.test.ts` verifying `traceparent` header presence and format.

## 4. Promptfoo Multi-Prompt Matrix & Phoenix Export

- [x] 4.1 Create prompt variations in `apps/agent/eval/prompts/`: `system-baseline.txt`, `system-compact.txt` (token-optimized), and `system-fewshot.txt` (golden Telegram history).
- [x] 4.2 Update `apps/agent/eval/promptfooconfig.yaml` to define multi-prompt matrix against Gemini models.
- [x] 4.3 Update `apps/agent/eval/provider.ts` to export evaluation run spans and metric summaries directly to Arize Phoenix under project `maniyy-agent-evals`.
- [x] 4.4 Expand `apps/agent/eval/dataset.ts` test assertions for tool accuracy, zero forbidden currencies, and rubric compliance.

## 5. CI/CD Pre-Deploy Evaluation Gatekeeper

- [x] 5.1 Create GitHub Actions workflow `.github/workflows/agent-eval.yml` that triggers on pull requests modifying `apps/agent/**`.
- [x] 5.2 Configure workflow steps: Bun setup, unit tests (`bun run test:agent`), Promptfoo evaluation execution, and threshold verification (100% financial tool accuracy, >=95% pass rate).
- [x] 5.3 Ensure pre-commit secret hygiene check passes clean via `bun scripts/check-secrets.ts`.

## 6. End-to-End Validation & Smoke Run

- [x] 6.1 Execute unit test suites across workspaces: `bun run test:web` and `bun run test:agent`.
- [x] 6.2 Run Promptfoo evaluation smoke test (`bunx promptfoo eval`) and verify test result export in Arize Phoenix UI (`https://phoenix.membran.app`).
- [x] 6.3 Run pre-commit secret scan: `bun scripts/check-secrets.ts`.
