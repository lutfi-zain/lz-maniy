import { describe, expect, it, vi, afterEach } from 'vitest';
import { createApiClient } from '../../agent/tools/http.js';
import { wrapToolsWithTracing } from '../../observability/instrument-tools.js';
import { WorkerTracer } from '../../observability/tracer.js';

describe('Agent Tool HTTP W3C Traceparent Propagation', () => {
	const originalFetch = globalThis.fetch;

	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	it('injects W3C traceparent and x-project-name headers into globalThis.fetch when executed inside wrapToolsWithTracing', async () => {
		const capturedHeaders: Array<Record<string, string>> = [];

		globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
			const h = (init?.headers ?? {}) as Record<string, string>;
			capturedHeaders.push(h);
			return new Response(JSON.stringify({ ok: true }), { status: 200 });
		}) as unknown as typeof fetch;

		const tracer = new WorkerTracer({
			traceId: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
			projectName: 'maniyy-agent-production'
		});

		const { request } = createApiClient('https://reedrich.example.com', 'test_token');
		const rawTools = {
			get_snapshot: {
				description: 'Get snapshot',
				execute: async () => {
					const res = await request('/api/v1/account-detail');
					return res.json();
				}
			}
		};

		const wrapped = wrapToolsWithTracing(rawTools, tracer, { includeSubSpans: true });
		await wrapped.get_snapshot.execute({});

		// First fetch is the tool's outbound call to reedrich.example.com
		expect(capturedHeaders.length).toBeGreaterThanOrEqual(1);
		const toolCallHeaders = capturedHeaders[0];
		expect(toolCallHeaders.traceparent).toMatch(
			/^00-a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4-[0-9a-f]{16}-01$/
		);
		expect(toolCallHeaders['x-project-name']).toBe('maniyy-agent-production');
		expect(toolCallHeaders['x-phoenix-project']).toBe('maniyy-agent-production');

		// Verify the parentSpanId in traceparent matches the created reedrich.rpc:get_snapshot span
		const rpcSpan = tracer.spans.find((s) => s.name === 'reedrich.rpc:get_snapshot');
		expect(rpcSpan).toBeDefined();
		expect(toolCallHeaders.traceparent).toBe(
			`00-a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4-${rpcSpan!.spanId}-01`
		);
	});

	it('injects W3C traceparent and x-project-name headers into Cloudflare Fetcher service binding', async () => {
		let capturedRequest: Request | null = null;
		const mockFetcher = {
			fetch: vi.fn().mockImplementation(async (req: Request) => {
				capturedRequest = req;
				return new Response(JSON.stringify({ wallets: [] }), { status: 200 });
			})
		} as unknown as Fetcher;

		const tracer = new WorkerTracer({
			traceId: '11223344556677881122334455667788',
			projectName: 'maniyy-agent-evals'
		});

		const { request } = createApiClient('https://reedrich.internal', 'tok_xyz', mockFetcher);
		const rawTools = {
			list_wallets: {
				description: 'List wallets',
				execute: async () => {
					const res = await request('/api/v1/wallets');
					return res.json();
				}
			}
		};

		const wrapped = wrapToolsWithTracing(rawTools, tracer, { includeSubSpans: true });
		await wrapped.list_wallets.execute({});

		expect(capturedRequest).not.toBeNull();
		expect(capturedRequest!.headers.get('traceparent')).toMatch(
			/^00-11223344556677881122334455667788-[0-9a-f]{16}-01$/
		);
		expect(capturedRequest!.headers.get('x-project-name')).toBe('maniyy-agent-evals');
	});
});
