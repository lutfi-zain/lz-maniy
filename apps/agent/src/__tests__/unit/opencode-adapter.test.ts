import { describe, it, expect, vi } from 'vitest';
import {
	generateId,
	createOpenCodeFetch,
	createOpenCodeProvider,
	OPENCODE_USER_AGENT,
	OPENCODE_BASE_URL
} from '../../agent/opencode-adapter.js';
import { getModel, AVAILABLE_MODELS } from '../../agent/models.js';

describe('OpenCode Adapter', () => {
	it('generates session and message IDs with proper prefixes', () => {
		const sesId = generateId('ses', true);
		expect(sesId).toMatch(/^ses_[0-9a-fA-F]{12}[0-9a-zA-Z]{14}$/);

		const msgId = generateId('msg', false);
		expect(msgId).toMatch(/^msg_[0-9a-fA-F]{12}[0-9a-zA-Z]{14}$/);
	});

	it('injects default public authorization and opencode CLI headers for opencode.ai requests', async () => {
		let capturedInit: RequestInit | undefined;
		const mockFetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
			capturedInit = init;
			return new Response(JSON.stringify({ ok: true }), { status: 200 });
		});

		const customFetch = createOpenCodeFetch('public', mockFetch as unknown as typeof fetch);

		await customFetch('https://opencode.ai/zen/v1/chat/completions', {
			method: 'POST',
			body: JSON.stringify({ model: 'muse-spark-1.3-contributor-free' })
		});

		expect(mockFetch).toHaveBeenCalledTimes(1);
		const headers = new Headers(capturedInit?.headers);

		expect(headers.get('Authorization')).toBe('Bearer public');
		expect(headers.get('User-Agent')).toBe(OPENCODE_USER_AGENT);
		expect(headers.get('x-opencode-client')).toBe('cli');
		expect(headers.get('x-opencode-project')).toBe('global');
		expect(headers.get('x-opencode-session')).toMatch(/^ses_/);
		expect(headers.get('x-opencode-request')).toMatch(/^msg_/);
	});

	it('preserves existing x-opencode-session if passed in headers', async () => {
		let capturedInit: RequestInit | undefined;
		const mockFetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
			capturedInit = init;
			return new Response(JSON.stringify({ ok: true }), { status: 200 });
		});

		const customFetch = createOpenCodeFetch('public', mockFetch as unknown as typeof fetch);

		await customFetch('https://opencode.ai/zen/v1/chat/completions', {
			method: 'POST',
			headers: {
				'x-opencode-session': 'custom-session-123'
			}
		});

		const headers = new Headers(capturedInit?.headers);
		expect(headers.get('x-opencode-session')).toBe('custom-session-123');
		expect(headers.get('x-opencode-request')).toMatch(/^msg_/);
	});

	it('creates openCode provider instance that can instantiate language models', () => {
		const provider = createOpenCodeProvider('public');
		const model = provider('muse-spark-1.3-contributor-free');
		expect(model.modelId).toBe('muse-spark-1.3-contributor-free');
		expect(model.provider).toContain('opencode');
	});

	it('integrates with getModel for opencode provider with safe fallback', () => {
		const mockEnv = {
			DB: {} as unknown as D1Database,
			CONFIG: {} as unknown as KVNamespace,
			REEDRICH_API_URL: 'http://localhost:3000',
			GEMINI_API_KEY: 'test-gemini',
			GROQ_API_KEY: 'test-groq',
			OPENCODE_API_KEY: 'public'
		};
		const model = getModel(mockEnv, 'opencode', 'muse-spark-1.3-contributor-free');
		expect(model).toBeDefined();
	});

	it('removes non-functional opencode models from AVAILABLE_MODELS', () => {
		const opencodeModels = AVAILABLE_MODELS.filter((m) => m.provider === 'opencode');
		expect(opencodeModels.length).toBe(0);
	});
});
