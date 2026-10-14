interface OTLPAttribute {
	key: string;
	value: { stringValue?: string; intValue?: string; boolValue?: boolean; doubleValue?: number };
}

interface OTLPSpan {
	name: string;
	parentSpanId?: string;
	attributes: OTLPAttribute[];
}

interface OTLPResourceSpan {
	resource: { attributes: OTLPAttribute[] };
	scopeSpans: Array<{ spans: OTLPSpan[] }>;
}

interface OTLPPayload {
	resourceSpans: OTLPResourceSpan[];
}

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	generateTraceId,
	generateSpanId,
	parseTraceParent,
	formatTraceParent,
	WorkerSpan,
	WorkerTracer
} from '../tracer.js';

describe('WorkerTracer and Span Utilities', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('generates valid 32-hex traceId and 16-hex spanId', () => {
		const traceId = generateTraceId();
		const spanId = generateSpanId();

		expect(traceId).toMatch(/^[0-9a-f]{32}$/);
		expect(spanId).toMatch(/^[0-9a-f]{16}$/);
	});

	it('parses valid W3C traceparent and returns null for invalid formats', () => {
		const valid = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
		const parsed = parseTraceParent(valid);

		expect(parsed).toEqual({
			traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
			parentSpanId: '00f067aa0ba902b7'
		});

		expect(parseTraceParent(null)).toBeNull();
		expect(parseTraceParent('')).toBeNull();
		expect(parseTraceParent('invalid-format-header')).toBeNull();
		expect(parseTraceParent('01-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01')).toBeNull();
	});

	it('formats W3C traceparent correctly', () => {
		const formatted = formatTraceParent('4bf92f3577b34da6a3ce929d0e0e4736', '00f067aa0ba902b7');
		expect(formatted).toBe('00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01');
	});

	it('creates spans and records attributes and exceptions', () => {
		const span = new WorkerSpan({
			traceId: 'trace-1234',
			spanId: 'span-5678',
			name: 'test-operation',
			kind: 1
		});

		span.setAttribute('test.str', 'value');
		span.setAttribute('test.num', 42);
		span.setAttribute('test.bool', true);

		expect(span.attributes).toEqual({
			'openinference.span.kind': 'CHAIN',
			'test.str': 'value',
			'test.num': 42,
			'test.bool': true
		});

		span.recordException(new Error('Sample failure'));
		expect(span.status.code).toBe(2);
		expect(span.status.message).toBe('Sample failure');
		expect(span.events).toHaveLength(1);
		expect(span.events[0].name).toBe('exception');

		span.end();
		expect(span.endTimeUnixNano).toBeDefined();
	});

	it('structures OTLP payload accurately with resource attributes', () => {
		const tracer = new WorkerTracer({
			serviceName: 'maniyy-agent',
			environment: 'staging',
			projectName: 'maniyy-agent-staging',
			traceId: '4bf92f3577b34da6a3ce929d0e0e4736'
		});

		const parentSpan = tracer.startSpan('root-step', { kind: 2 });
		parentSpan.setAttribute('user.id', 'usr_123');

		const childSpan = tracer.startSpan('sub-step', {
			parentSpanId: parentSpan.spanId,
			kind: 1
		});
		childSpan.setAttribute('operation.count', 5);

		parentSpan.end();
		childSpan.end();

		const payload = tracer.toOTLPPayload() as unknown as OTLPPayload;
		expect(payload.resourceSpans).toBeDefined();
		expect(payload.resourceSpans).toHaveLength(1);

		const resourceAttrs = payload.resourceSpans[0].resource.attributes;
		const serviceNameAttr = resourceAttrs.find((a) => a.key === 'service.name');
		const envAttr = resourceAttrs.find((a) => a.key === 'deployment.environment');
		const projectAttr = resourceAttrs.find((a) => a.key === 'project.name');
		expect(serviceNameAttr.value.stringValue).toBe('maniyy-agent');
		expect(envAttr.value.stringValue).toBe('staging');
		expect(projectAttr.value.stringValue).toBe('maniyy-agent-staging');

		const spans = payload.resourceSpans[0].scopeSpans[0].spans;
		expect(spans).toHaveLength(2);
		expect(spans[0].name).toBe('root-step');
		expect(spans[1].name).toBe('sub-step');
		expect(spans[1].parentSpanId).toBe(parentSpan.spanId);
	});

	it('flushes OTLP payload via fetch to Phoenix endpoint', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			statusText: 'OK'
		});
		vi.stubGlobal('fetch', fetchMock);

		const tracer = new WorkerTracer({
			endpoint: 'https://phoenix.membran.app/v1/traces',
			apiKey: 'secret-token-123',
			projectName: 'maniyy-agent-test'
		});

		tracer.startSpan('mock-span');
		await tracer.flush();

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, options] = fetchMock.mock.calls[0];
		expect(url).toBe('https://phoenix.membran.app/v1/traces');
		expect(options.method).toBe('POST');
		expect(options.headers['Authorization']).toBe('Bearer secret-token-123');
		expect(options.headers['x-phoenix-project']).toBe('maniyy-agent-test');
		expect(options.headers['Content-Type']).toBe('application/x-protobuf');
	});

	it('flushes OTLP payload concurrently to Phoenix and Langfuse when Langfuse is enabled', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			statusText: 'OK'
		});
		vi.stubGlobal('fetch', fetchMock);

		const tracer = new WorkerTracer({
			endpoint: 'https://phoenix.membran.app/v1/traces',
			apiKey: 'secret-token-123',
			projectName: 'maniyy-agent-test',
			langfuseEndpoint: 'https://us.cloud.langfuse.com',
			langfusePublicKey: 'pk-lf-test-public-key',
			langfuseSecretKey: 'sk-lf-test-secret-key',
			langfuseEnabled: 'true'
		});

		expect(tracer.isLangfuseEnabled()).toBe(true);

		tracer.startSpan('dual-mock-span');
		await tracer.flush();

		expect(fetchMock).toHaveBeenCalledTimes(2);
		const calls = fetchMock.mock.calls;
		const urls = calls.map((c: [string, RequestInit]) => c[0]);
		expect(urls).toContain('https://phoenix.membran.app/v1/traces');
		expect(urls).toContain('https://us.cloud.langfuse.com/api/public/otel/v1/traces');

		const langfuseCall = calls.find((c: [string, RequestInit]) => c[0] === 'https://us.cloud.langfuse.com/api/public/otel/v1/traces')!;
		const langfuseHeaders = langfuseCall[1].headers as Record<string, string>;
		expect(langfuseHeaders['Content-Type']).toBe('application/x-protobuf');
		expect(langfuseHeaders['x-langfuse-ingestion-version']).toBe('4');
		const expectedBasic = `Basic ${btoa('pk-lf-test-public-key:sk-lf-test-secret-key')}`;
		expect(langfuseHeaders['Authorization']).toBe(expectedBasic);
	});

	it('bypasses Langfuse export when disabled or credentials missing', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			statusText: 'OK'
		});
		vi.stubGlobal('fetch', fetchMock);

		const tracerDisabled = new WorkerTracer({
			endpoint: 'https://phoenix.membran.app/v1/traces',
			langfuseEndpoint: 'https://us.cloud.langfuse.com',
			langfusePublicKey: 'pk-lf-test',
			langfuseSecretKey: 'sk-lf-test',
			langfuseEnabled: 'false'
		});
		expect(tracerDisabled.isLangfuseEnabled()).toBe(false);

		tracerDisabled.startSpan('disabled-span');
		await tracerDisabled.flush();

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock.mock.calls[0][0]).toBe('https://phoenix.membran.app/v1/traces');
	});

	it('isolates Langfuse export errors without throwing or failing Phoenix', async () => {
		const fetchMock = vi.fn().mockImplementation((url: string) => {
			if (url.includes('langfuse')) {
				return Promise.reject(new Error('Langfuse network timeout'));
			}
			return Promise.resolve({ ok: true, status: 200, statusText: 'OK' });
		});
		vi.stubGlobal('fetch', fetchMock);

		const tracer = new WorkerTracer({
			endpoint: 'https://phoenix.membran.app/v1/traces',
			langfuseEndpoint: 'https://us.cloud.langfuse.com',
			langfusePublicKey: 'pk-lf-test',
			langfuseSecretKey: 'sk-lf-test',
			langfuseEnabled: 'true'
		});

		tracer.startSpan('resilient-span');
		await expect(tracer.flush()).resolves.not.toThrow();
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('mirrors user.id and enforces bidirectional session.id/conversation.id parity for Phoenix and Langfuse', () => {
		const span = new WorkerSpan({
			traceId: '12345678901234567890123456789012',
			spanId: '1234567890123456',
			name: 'chat-turn'
		});

		// Test user.id mirroring
		span.setAttribute('user.id', 'usr_lutfi_test');
		expect(span.attributes['user.id']).toBe('usr_lutfi_test');
		expect(span.attributes['langfuse.user.id']).toBe('usr_lutfi_test');

		// Test conversation.id -> session.id & langfuse.session.id
		span.setAttribute('conversation.id', 'conv_uuid_456');
		expect(span.attributes['session.id']).toBe('conv_uuid_456');
		expect(span.attributes['conversation.id']).toBe('conv_uuid_456');
		expect(span.attributes['langfuse.session.id']).toBe('conv_uuid_456');

		// Test session.id -> conversation.id & langfuse.session.id
		const span2 = new WorkerSpan({
			traceId: '12345678901234567890123456789012',
			spanId: 'abcdef0123456789',
			name: 'root-chat'
		});
		span2.setAttribute('session.id', 'session_live_999');
		expect(span2.attributes['session.id']).toBe('session_live_999');
		expect(span2.attributes['conversation.id']).toBe('session_live_999');
		expect(span2.attributes['langfuse.session.id']).toBe('session_live_999');
	});
});
