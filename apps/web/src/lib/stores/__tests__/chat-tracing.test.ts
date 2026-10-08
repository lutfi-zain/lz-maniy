import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateTraceParent, ChatStore } from '../chat.svelte.js';
import { authStore } from '../auth.svelte.js';

describe('Frontend Chat Distributed Tracing Context', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('generates compliant W3C traceparent strings', () => {
		const tp = generateTraceParent();
		expect(tp).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
	});

	it('generates distinct trace and span identifiers across invocations', () => {
		const tp1 = generateTraceParent();
		const tp2 = generateTraceParent();

		expect(tp1).not.toBe(tp2);

		const [, traceId1, spanId1] = tp1.split('-');
		const [, traceId2, spanId2] = tp2.split('-');

		expect(traceId1).not.toBe(traceId2);
		expect(spanId1).not.toBe(spanId2);
	});

	it('attaches traceparent header to outgoing chat requests', async () => {
		let capturedTraceParent: string | null = null;

		const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
			if (String(url).includes('/api/credits')) {
				return new Response(JSON.stringify({ balance: 500 }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				});
			}

			if (String(url).includes('/api/chat')) {
				if (init?.headers) {
					const headers = new Headers(init.headers);
					capturedTraceParent = headers.get('traceparent');
				}
				const stream = new ReadableStream({
					start(controller) {
						controller.enqueue(new TextEncoder().encode('0:"Halo Lutfi"\n'));
						controller.close();
					}
				});
				return new Response(stream, {
					status: 200,
					headers: {
						'Content-Type': 'text/plain',
						'X-Conversation-Id': 'conv-test-123',
						'X-Is-New-Conversation': '0'
					}
				});
			}

			return new Response('{}', { status: 200 });
		});

		vi.stubGlobal('fetch', fetchMock);

		authStore.accessToken = 'mock-test-jwt-token';
		authStore.expiresAt = Date.now() + 3600_000;

		const store = new ChatStore();
		await store.sendMessage('Cek saldo saya');
		expect(fetchMock).toHaveBeenCalled();
		expect(capturedTraceParent).not.toBeNull();
		expect(capturedTraceParent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
	});
});
