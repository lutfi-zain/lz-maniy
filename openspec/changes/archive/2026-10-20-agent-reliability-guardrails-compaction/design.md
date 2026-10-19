## Context

The Maniy financial agent (`apps/agent`) runs as a Cloudflare Worker using Hono, Vercel AI SDK (`streamText`), and Cloudflare D1. Currently:
- Step iteration is hardcoded to `maxSteps: 10` in `src/routes/chat.ts`, failing high-iteration workflows such as statement import reconciliation and multi-period horizon simulations, while lacking cycle detection against ping-pong tool loops.
- Conversation compaction (`src/agent/compaction.ts`) relies on an unachievable 800k-token threshold (`contextWindow: 1_000_000` with an 80% threshold), ignores multi-kilobyte structured tool inputs and outputs, and loses summaries due to `waitUntil` race conditions and role filtering in `rawPriorMessages`.
- Guardrails are reactive and fragmented, lacking input injection screening, policy confirmation gates, and in-band output grounding.
- The evaluation flywheel (`src/observability/flywheel.ts` and `db/migrations/0006_eval_flywheel.sql`) supports only 14 categories and lacks triggers for guardrail trips and iteration exhaustion.

See `proposal.md` for background and motivation.

## Goals / Non-Goals

**Goals:**
- Provide dynamic step budgeting supporting from 5 up to 40 steps per request based on task classification.
- Halt infinite tool loops via a rolling hash cycle breaker and stream progress telemetry during multi-step runs.
- Enforce an operational working memory ceiling (16k–24k tokens) with accurate token accounting across tool payloads.
- Preserve critical financial entities (wallet IDs, balances, commitments) post-compaction and inject summaries directly into the active system context.
- Establish a 4-tier guardrail pipeline: input injection screening, policy gates, schema enforcement, and output grounding.
- Extend Level 0 through Level 4 evaluations and update the D1 Flywheel schema with new domain categories and rubrics.

**Non-Goals:**
- Client-side SvelteKit UI redesign (except displaying SSE progress events and handling confirmation modal signals).
- Modifying underlying Reedrich REST API contracts or D1 core schema outside the agent and eval subsystems.
- Replacing the Vercel AI SDK runtime or OMP AI Gateway infrastructure.

## Decisions

### 1. Adaptive Iteration Engine & Cycle Breaker
- **Dynamic Step Allocation**: Classify incoming requests before invoking `streamText`:
  - `standard` (conversational query / single lookup): `maxSteps: 8`.
  - `mutation` (plan -> execute -> verify): `maxSteps: 5`.
  - `deep_audit` (statement import / multi-page pagination / multi-period horizon): `maxSteps: 40`.
- **Rolling Cycle Breaker**: Track the execution history of tool signatures `sha256(toolName + ":" + canonicalJsonStringify(args))`. By recursively sorting JSON argument keys before hashing, the breaker avoids false negatives from nondeterministic LLM key serialization. If two consecutive identical tool invocations yield identical empty or error payloads, abort the iteration loop immediately.
- **SSE Stream Progress Telemetry**: When executing step 2 or higher, enqueue progress packets into the transformed stream using AI SDK Data Stream array format (`2:[{"type":"progress","step":n,"action":"..."}]\n`). This prevents edge HTTP idle disconnects while avoiding collision with `d:` (which is strictly reserved for terminal credit settlement in `chat.ts`).
- **Guaranteed Fallback Synthesis**: If `maxSteps` is exhausted, invoke `attemptFallbackSynthesis` with captured intermediate results using an independent `generateText` invocation omitting `tools` entirely, guaranteeing no further tool calling.

```
       +-----------------------------------------------------------+
       |             ADAPTIVE STEP & CYCLE BREAKER FLOW            |
       +-----------------------------------------------------------+
                                     |
                                     v
                        [Classify Request Intent]
                                     |
                         +-----------+-----------+
                         |                       |
                  (Deep Audit)               (Standard)
                  maxSteps = 40             maxSteps = 8
                         |                       |
                         +-----------+-----------+
                                     |
                                     v
                          [Execute Tool in Loop]
                                     |
                     +---------------+---------------+
                     |                               |
          [Check Signature Hash]           [Emit SSE Heartbeat]
          (Consecutive identical?)         ("Membaca hal 14...")
                     |
         +-----------+-----------+
         | Yes                   | No
         v                       v
  [Trip Circuit]         [Continue Next Step]
  (Force Synthesis)              |
                                 v
                     [Step >= maxSteps?]
                                 |
                                 v
                     [Graceful Fallback Synthesis]
```

### 2. Entity-Preserving Compaction Architecture
- **Operational Working Memory Ceiling**: Set threshold to `20,000` tokens (calibrated to stay within optimal LLM attention retrieval zones per "Lost in the Middle").
- **Full-Payload Token Estimator**: Calculate tokens using character-level subword heuristics (`Math.ceil(totalChars / 3.2)`) accounting for:
  - User and assistant text.
  - Tool invocation arguments.
  - Tool execution response JSON strings (`JSON.stringify(toolResult)`).
- **In-Flight Volatile Tool Pruning**: In multi-step sequences exceeding 8 steps, truncate tool outputs older than the last 2 steps into one-line digests in the in-memory context before passing to subsequent iterations.
- **Extractive-Abstractive Financial Ledger**: Compaction uses a structured prompt extracting:
  - Latest Known Balances by Wallet ID.
  - Active Commitments & Unsettled Planned Transactions.
  - User Preferences & Constraints.
- **Context Injection Fix**: Store the compaction summary in D1 `conversations.compaction_summary`. In `chat.ts`, inject this summary as a dedicated section in `buildSystemPrompt()` rather than emitting a raw `system` message filtered out by `rawPriorMessages`.

```
+-------------------------------------------------------------------------------+
|                       COMPACTION & RETENTION PIPELINE                         |
+-------------------------------------------------------------------------------+

  [History: Messages + Tool Calls + Multi-KB Results]
                            |
                            v
             +------------------------------+
             | Dual Token Estimator         |
             | (Chars/3.2 across all JSON)  |
             +------------------------------+
                            |
                > 20,000 Token Ceiling?
                            |
             +--------------+--------------+
             | Yes                         | No
             v                             v
  +----------------------+      [Pass Unaltered to LLM]
  | Extractive Ledger    |
  | Compactor Worker     |
  +----------------------+
             |
             v
  [Extract Balances, IDs, & Commitments]
             |
             v
  [Update D1: compaction_summary & compacted_at]
             |
             v
  [Inject into buildSystemPrompt() on Next Turn]
```

### 3. 4-Tier Financial Guardrails Architecture
- **Tier 1 (Input Rails - Pre-LLM)**:
  - Dual-language regex scanner covering English and Indonesian jailbreak keywords (`"ignore previous"`, `"developer mode"`, `"system override"`, `"abaikan instruksi"`, `"lupakan aturan"`, `"mode leluasa"`) paired with zero-width character stripping and markdown delimiter canonicalization.
  - Indirect Injection Fencing: Ingested external bank statement rows and transaction notes are strictly fenced within `<untrusted_user_data>` XML delimiters before entering LLM context, with explicit instructions forbidding tool invocation from transaction remarks.
  - Scope classifier: Reject non-financial hazardous prompts (malware generation, offensive content) with standard polite refusals without calling external tools.
- **Tier 2 (Dialog Policy Rails - In-Flight)**:
  - *Locked Cash Guard*: Intercept prompts attempting to spend or transfer from locked wallets (`isLocked: 1`) and enforce defensive refusal.
  - *Server-Enforced Confirmation Gate*: For mutations exceeding `Rp 5.000.000` or destructive actions (`delete_wallet`), tools require a cryptographic or two-phase confirmation token generated by user UI interaction, preventing models from self-approving mutations via prompt injection.
- **Tier 3 (Tool Execution Rails - Sandboxing)**:
  - Strict parameter validation with Zod schemas.
  - Enforce user tenancy (`userId` from authenticated session) on all mutation tools to prevent Cross-Tenant access.
- **Tier 4 (Output Rails - Post-LLM)**:
  - *In-Band Numeric Grounding with Arithmetic Derivation*: Extract 4+ digit numbers from streamed assistant chunks. Verify numbers against user input numbers, tool output numbers, and legitimate arithmetic derivations (sums, differences, FX conversion rates from tool parameters). Flag and redact uncorroborated balances.
  - *Anti-Slop & Currency Normalization*: Strip Unicode emojis and enforce standard `Rp X.XXX.XXX` formatting, disallowing raw `$` symbols.
```
+-------------------------------------------------------------------------------+
|                          4-TIER GUARDRAIL ARCHITECTURE                        |
+-------------------------------------------------------------------------------+

  [Incoming User Request]
             |
             v
  [Tier 1: Input Rail] ----------> Injection / Jailbreak Detected?
             |                     ├── Yes: Polite Safety Refusal ($0 LLM cost)
             | No                  └── No: Proceed
             v
  [Tier 2: Dialog Policy Rail] --> High-Value Mutation or Locked Fund Raid?
             |                     ├── Raid: Enforce Defensive Advisory
             |                     └── Mutation > 5M: Emit Confirmation Gate
             v
  [Tier 3: Tool Execution Rail] -> Strict Zod Validation & Tenant Isolation
             |
             v
  [Tier 4: Output Rail] ---------> Extract 4+ Digit Numbers & Format
                                   ├── Grounded in Tool/Prompt: Allow
                                   └── Hallucinated: Fallback Factual Disclaimer
```

### 4. Evaluation Framework & Flywheel Expansion
- **Level 0 (Deterministic Code Evaluators)**:
  - Add `evalIterationEfficiency(stepCount, redundantCalls)`: Score based on step budget usage.
  - Add `evalInputInjectionDefense(prompt, output)`: Verify refusal on adversarial prompts.
  - Add `evalCompactionRetention(preSummaryEntities, postSummaryText)`: Verify retention of wallet IDs and balances.
- **Level 1 (Async LLM Judge)**:
  - Update `buildJudgePrompt()` in `src/observability/async-judge.ts` to evaluate `guardrailCompliance` and `contextRetention`.
- **Level 2 (Pre-Deploy CI Gate - Promptfoo)**:
  - Add adversarial test cases in `eval/dataset.ts` covering indirect injection in transaction notes.
- **Level 3 (Offline Benchmarks - Arize Phoenix)**:
  - Register new categories in `EVAL_DATASET`: `'guardrail_safety'` and `'compaction_retention'`.
- **Level 4 & Flywheel (Live Telemetry & D1 Storage)**:
  - Create migration `0007_guardrails_compaction_flywheel.sql` using SQLite table recreation pattern (`CREATE TABLE new... INSERT INTO new SELECT... DROP old... RENAME new TO old`) to safely update CHECK constraints in D1:
    - Extend `eval_queue.trigger_reason` CHECK to include `'guardrail_trip'` and `'iteration_exhaustion'`.
    - Extend `eval_dataset_candidates.domain_category` CHECK to include `'guardrail_safety'` and `'compaction_retention'`.
    - Extend `eval_dataset_candidates.evaluator_rubric` CHECK to include `'guardrail_compliance'` and `'context_retention'`.
  - In `async-judge.ts`, implement a Two-Tier Veto Gate: `overallPass = (financialSoundness >= 0.7) && (guardrailCompliance >= 0.7) && (overallScore >= 0.7)`.
  - In `flywheel.ts`, pass `ScrubberContext` with user real name and email to `scrubPII` to ensure full Pass 4 name redaction, and normalize tool name access via `t.toolName || t.name`.
## Risks / Trade-offs

- **Risk: In-Band Grounding Latency**:
  - *Mitigation*: Run numeric extraction using regex on assembled buffer deltas with sub-millisecond Set lookups. No secondary LLM call is used for in-band checking.
- **Risk: Edge Timeout on 40-Step Runs**:
  - *Mitigation*: Stream progress packets (`2:[{"type":"progress",...}]`) on every iteration to keep the HTTP socket active across the Cloudflare edge proxy without interfering with credit settlement.
- **Risk: Compaction Information Loss**:
  - *Mitigation*: Use an extractive key-value table schema for the financial state and preserve the last 4 turns untouched.
- **Risk: False Positives in Input Injection Filter**:
  - *Mitigation*: Restrict pattern matching to unambiguous system override and jailbreak delimiters; legitimate financial queries containing words like "override budget" are disambiguated by semantic regex guards.

## Test Strategy

- **Unit Tests (`bun run test:agent`)**:
  - `iteration-budget.test.ts`: Verify dynamic step limits and cycle breaker halts.
  - `compaction.test.ts`: Verify token estimation across tool payloads, working memory triggering, and ledger summary retention.
  - `guardrails.test.ts`: Test Tier 1 input injection filter, Tier 2 confirmation gates, and Tier 4 numeric grounding.
  - `flywheel-schema.test.ts`: Verify D1 migration constraints and candidate classification.
- **Integration Tests**:
  - Multi-step statement reconciliation test verifying completion across dozens of iterations without timeout.
- **CI Gate (`bun run eval:promptfoo`)**:
  - Regression benchmark validating $\ge 95\%$ pass rate across the expanded test dataset including guardrails and compaction cases.
