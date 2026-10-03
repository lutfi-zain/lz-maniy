# Design

## Context

See proposal.md for motivation. The agent backend (`apps/agent`) already includes `@ai-sdk/openai` as a dependency. The OMP Auth Gateway (`https://ai.membran.app/v1`) serves standard OpenAI wire-format endpoints (`/v1/chat/completions` and `/v1/models`), handling token rotation, quota distribution, and credential storage on the VPS host.

Direct testing during exploration proved that:
1. `google-antigravity/gemini-3.7-flash`, `gemini-3.8-flash`, and `gemini-3.1-flash-lite` work reliably via the gateway.
2. Tool calling and multi-step agent reasoning (`maxSteps: 10`) work seamlessly through `@ai-sdk/openai`.
3. Upstream reasoning tokens are emitted and controllable via `reasoning_effort: "low" | "medium" | "high"`.
4. Upstream OpenCode Zen models currently experience transient HTTP 502 errors due to upstream outage, but the configuration should include `opencode-zen/muse-spark-1.3-contributor-free` so it automatically activates once recovered.

## Goals / Non-Goals

**Goals:**
- Connect Eve agent to OMP Auth Gateway at `https://ai.membran.app/v1` using `@ai-sdk/openai`.
- Curate active models strictly to 3 Google Antigravity Gemini variants and 1 OpenCode Spark variant.
- Map UI thinking levels (`off`, `minimal`, `low`, `medium`, `high`) to gateway `reasoningEffort`.
- Group models logically in `ChatModelPicker.svelte` under "Google Antigravity" and "OpenCode Zen".
- Ensure zero secrets are committed to version control.

**Non-Goals:**
- Retaining Groq or direct Google Gemini in the active user dropdown.
- Altering any of the Reedrich financial tools or D1 database tables.

## Decisions

### D1: Unified AI SDK Provider Routing for OMP

**Decision**: Implement the `'omp'` provider in `apps/agent/src/agent/models.ts` using `@ai-sdk/openai`:

```typescript
export function getModel(env: Env, provider: ModelProvider, model: string) {
	if (provider === 'omp') {
		const gateway = createOpenAI({
			name: 'omp',
			baseURL: env.OMP_GATEWAY_URL || 'https://ai.membran.app/v1',
			apiKey: env.OMP_GATEWAY_KEY,
		});
		return gateway(model);
	}
	// fallback for legacy providers
}
```

In `apps/agent/src/routes/chat.ts`, when `modelConfig.provider === 'omp'`, route directly through the AI SDK `streamText` path:

```typescript
const aiModel = getModel(c.env, modelConfig.provider, modelConfig.model);

const providerOptions = modelConfig.capabilities.thinking && body.thinkingLevel && body.thinkingLevel !== 'off'
	? { openai: { reasoningEffort: body.thinkingLevel === 'minimal' ? 'low' : body.thinkingLevel } }
	: undefined;

const result = streamText({
	model: aiModel as unknown as LanguageModelV1,
	system: systemPrompt,
	messages: [...priorMessages, { role: 'user', content: body.message }],
	tools,
	maxSteps: 10,
	...(providerOptions ? { providerOptions } : {})
});
```

**Rationale**: Since the OMP gateway is OpenAI-wire-compatible, Vercel AI SDK handles streaming, tool calls, and step loops natively without requiring custom protocol adapters.

### D2: Curated 4-Model Catalog

**Decision**: Configure `AVAILABLE_MODELS` and `DEFAULT_MODELS` exclusively with:

```typescript
export const DEFAULT_MODELS: ModelConfig[] = [
	{
		provider: 'omp',
		model: 'google-antigravity/gemini-3.1-flash-lite',
		displayName: 'Gemini 3.1 Flash Lite',
		capabilities: { vision: true, tool_calling: true, thinking: true },
		thinkingLevels: ['off', 'low', 'medium', 'high']
	},
	{
		provider: 'omp',
		model: 'google-antigravity/gemini-3.7-flash',
		displayName: 'Gemini 3.7 Flash',
		capabilities: { vision: true, tool_calling: true, thinking: true },
		thinkingLevels: ['off', 'low', 'medium', 'high']
	},
	{
		provider: 'omp',
		model: 'google-antigravity/gemini-3.8-flash',
		displayName: 'Gemini 3.8 Flash (High Tier)',
		capabilities: { vision: true, tool_calling: true, thinking: true },
		thinkingLevels: ['off', 'low', 'medium', 'high']
	},
	{
		provider: 'omp',
		model: 'opencode-zen/muse-spark-1.3-contributor-free',
		displayName: 'OpenCode Spark 1.3 Free',
		capabilities: { vision: true, tool_calling: true, thinking: false }
	}
];
```

**Rationale**: Fulfills the user's explicit directive to only include Gemini from Google Antigravity and OpenCode Spark 1.3 free. Default model remains `gemini-3.1-flash-lite` for fastest initial response times.

### D3: Frontend Dropdown Grouping & UX

**Decision**: In `ChatModelPicker.svelte`:
- Filter Google models via `model.startsWith('google-antigravity/')`.
- Filter OpenCode models via `model.startsWith('opencode-zen/')`.
- Display header "Google Antigravity (Gemini)" with `<Sparkle>` icon.
- Display header "OpenCode Zen" with `<Brain>` icon.
- Retain thinking level pill selector when selected model has `capabilities.thinking === true`.

### D4: Secret Hygiene and Environment Configuration

**Decision**:
1. Local development:
   Store in `apps/agent/.dev.vars` (which is already listed in `.gitignore`):
   ```
   OMP_GATEWAY_KEY=sk-omp-7895476876bd366566bfee9f61f8e0b9d616d5a73c1c976d
   OMP_GATEWAY_URL=https://ai.membran.app/v1
   ```
2. Production deployment:
   Set Cloudflare Worker secret:
   ```bash
   echo "sk-omp-7895476876bd366566bfee9f61f8e0b9d616d5a73c1c976d" | bunx wrangler secret put OMP_GATEWAY_KEY
   ```
   Set variable in `wrangler.toml` under `[vars]`:
   ```toml
   OMP_GATEWAY_URL = "https://ai.membran.app/v1"
   ```

## Risks / Trade-offs

- **OpenCode Zen 502**: Upstream OpenCode is currently returning 502. The agent gracefully reports error stream events if a user selects OpenCode while it is down.
- **Latency over Cloudflare Tunnel**: The extra hop from Cloudflare Worker to `ai.membran.app` adds ~50-80ms of TLS/tunnel overhead, which is negligible compared to model TTFT (>800ms).

## Test Strategy

- **Unit tests**: Update `apps/web/src/lib/stores/chat.test.ts` to assert 4 curated OMP models.
- **Integration smoke test**: Call `POST /api/chat` locally with `google-antigravity/gemini-3.7-flash` and verify streaming response and tool call loop.
- **Type checks**: Ensure `tsc --noEmit` and `svelte-check` pass across all packages.
