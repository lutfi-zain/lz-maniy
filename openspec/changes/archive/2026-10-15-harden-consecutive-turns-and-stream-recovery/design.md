## Context

See `proposal.md` for background and incident context.

The Maniy Agent runs on Cloudflare Workers using the Vercel AI SDK (`streamText`) connected to the OMP AI Gateway (`google-antigravity/gemini-3.8-flash`). In multi-turn chat sessions, messages are persisted to Cloudflare D1. When a turn fails midway through execution (e.g. during Step 2 model continuation after Step 1 tools have succeeded), the user message has already been written to D1, but no assistant response is saved. 

On subsequent user messages or retry attempts in that conversation:
1. `listMessages` loads the prior messages, the last of which is `role: 'user'`.
2. `chat.ts` appends the new `role: 'user'` message to `messages`.
3. Gemini API strictly rejects consecutive user messages with HTTP 400 (`Please ensure that multiturn requests alternate between user and model roles`), permanently locking the conversation.
4. Furthermore, fallback synthesis via `attemptFallbackSynthesis` fails because `capturedToolResults` is populated only inside `onFinish`, which has not fired when stream error chunks (`3:`) arrive or when stream readers abort.

## Goals / Non-Goals

**Goals:**
- **Zero Data Loss**: User messages in D1 and the frontend chat UI MUST remain 100% intact. No user messages or conversations are deleted or wiped from the database.
- **Strict Model Alternation**: Guarantee that all message payloads sent to LLM providers alternate strictly between `user` and `assistant`.
- **Synchronous Real-Time Tool Capture**: Capture tool results into `capturedToolResults` immediately upon tool completion in runtime, before the model is called for Step 2 synthesis.
- **Resilient Fallback Synthesis**: Ensure that if the stream reader encounters an error event (`3:`) or an exception, `attemptFallbackSynthesis` uses the in-memory tool results to stream a structured Indonesian financial response.

**Non-Goals:**
- Modifying client-side SvelteKit UI stores or UI components.
- Changing database schemas or altering D1 migration scripts.
- Rewriting the Vercel AI SDK data stream protocol.

## Decisions

### 1. Pure In-Memory History Sanitizer (`sanitizeHistoryForModel`)
Introduce a deterministic helper function `sanitizeHistoryForModel`:
```ts
export function sanitizeHistoryForModel<T extends { role: string; content: unknown }>(
    messages: T[]
): T[] {
    const sanitized: T[] = [];
    for (const msg of messages) {
        if (msg.role !== 'user' && msg.role !== 'assistant') continue;
        if (sanitized.length > 0 && sanitized[sanitized.length - 1].role === msg.role) {
            // Consecutive duplicate role: replace with the latest turn or merge
            sanitized[sanitized.length - 1] = msg;
        } else {
            sanitized.push(msg);
        }
    }
    return sanitized;
}
```
When preparing `priorMessages` in `chat.ts`:
1. `sanitizeHistoryForModel` collapses any consecutive duplicates.
2. If `priorMessages` ends with `role: 'user'`, that dangling turn is pruned from the model payload (because the incoming `userMessageContent` represents the active user turn).
3. The resulting payload sent to `streamText` is guaranteed to end in `assistant` before the new `user` message is appended, satisfying Gemini's strict alternation invariant.

### 2. Synchronous Real-Time Tool Result Hook in `wrapToolsWithTracing`
Extend `wrapToolsWithTracing` with an optional `onToolResult` hook:
```ts
export interface WrapToolsOptions {
    includeSubSpans?: boolean;
    onToolResult?: (toolName: string, args: unknown, result: unknown) => void;
}
```
Inside the wrapped `execute` function, immediately after `const result = await executeFn(args, options)` succeeds:
```ts
wrapOptions?.onToolResult?.(toolName, args, result);
```
In `chat.ts`:
```ts
const tools = wrapToolsWithTracing(rawTools, tracer, {
    includeSubSpans: true,
    onToolResult: (toolName, args, result) => {
        capturedToolResults.push({ toolName, args, result });
    }
});
```
This guarantees that `capturedToolResults` is populated before Step 2 begins, independent of `onFinish`.

### 3. Comprehensive Stream Fallback in Reader & Catch Block
In `transformDataStream`:
- When line `3:` is parsed: if `capturedToolResults.length > 0`, invoke `attemptFallbackSynthesis(aiModel, body.message, capturedToolResults)` and yield the synthesized answer as text delta `0:...`.
- In `transformedReadable`'s `catch (err)` block: if `capturedToolResults.length > 0` and no text has been emitted yet, invoke `attemptFallbackSynthesis` and enqueue the result to the stream before closing.

## Risks / Trade-offs

- **Risk**: Dropping a dangling user turn from the model payload might omit previous context if the user asked a multi-part question before a crash.
  - **Mitigation**: The unresponded turn was never answered by the agent anyway; the user is either re-asking (retry) or following up. Keeping the latest user question in focus prevents the hard 400 crash while keeping the database records intact.
- **Risk**: Increased memory usage if tools return large payloads.
  - **Mitigation**: Tool DTOs are already compacted (e.g. `horizon_projection` is under 3KB), and `capturedToolResults` is scoped to a single request lifecycle on the edge worker.
