import { ProtobufTraceSerializer } from '@opentelemetry/otlp-transformer';

/**
 * WorkerTracer: Lightweight fetch-based OpenTelemetry OTLP tracer tailored for Cloudflare Workers.
 * Exports traces directly to Arize Phoenix (/v1/traces) with zero Node.js dependencies.
 */

export interface SpanAttributes {
	[key: string]: string | number | boolean | undefined;
}

export interface SpanEvent {
	name: string;
	timeUnixNano: string;
	attributes?: SpanAttributes;
}

export type SpanStatusCode = 0 | 1 | 2; // 0 = UNSET, 1 = OK, 2 = ERROR

export interface SpanStatus {
	code: SpanStatusCode;
	message?: string;
}

export interface TracerConfig {
	endpoint?: string;
	apiKey?: string;
	serviceName?: string;
	serviceVersion?: string;
	environment?: string;
	projectName?: string;
	traceId?: string;
	parentSpanId?: string;
}

export function generateTraceId(): string {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function generateSpanId(): string {
	const bytes = new Uint8Array(8);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function parseTraceParent(header?: string | null): { traceId: string; parentSpanId: string } | null {
	if (!header) return null;
	const match = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/i.exec(header.trim());
	if (!match) return null;
	return {
		traceId: match[1],
		parentSpanId: match[2]
	};
}

export function formatTraceParent(traceId: string, spanId: string): string {
	return `00-${traceId}-${spanId}-01`;
}

function toUnixNano(ms: number): string {
	const fullMs = Math.floor(ms);
	const fraction = ms - fullMs;
	const nanoPart = Math.floor(fraction * 1_000_000);
	return `${BigInt(fullMs) * 1_000_000n + BigInt(nanoPart)}`;
}

export class WorkerSpan {
	public readonly traceId: string;
	public readonly spanId: string;
	public readonly parentSpanId?: string;
	public readonly name: string;
	public readonly kind: number;
	public readonly startTimeUnixNano: string;
	public endTimeUnixNano?: string;
	public attributes: Record<string, string | number | boolean> = {};
	public events: SpanEvent[] = [];
	public status: SpanStatus = { code: 0 };
	private isEnded = false;

	constructor(options: {
		traceId: string;
		spanId: string;
		name: string;
		parentSpanId?: string;
		kind?: number;
		startTimeMs?: number;
		attributes?: SpanAttributes;
	}) {
		this.traceId = options.traceId;
		this.spanId = options.spanId;
		this.name = options.name;
		this.parentSpanId = options.parentSpanId;
		this.kind = options.kind ?? 1; // 1 = INTERNAL, 2 = SERVER, 3 = CLIENT
		this.startTimeUnixNano = toUnixNano(options.startTimeMs ?? Date.now());

		if (options.attributes) {
			this.setAttributes(options.attributes);
		}
	}

	setAttribute(key: string, value: string | number | boolean | undefined): this {
		if (value !== undefined) {
			this.attributes[key] = value;
		}
		return this;
	}

	setAttributes(attrs: SpanAttributes): this {
		for (const [key, value] of Object.entries(attrs)) {
			this.setAttribute(key, value);
		}
		return this;
	}

	setStatus(status: SpanStatus): this {
		this.status = status;
		return this;
	}

	recordException(err: unknown): this {
		const message = err instanceof Error ? err.message : String(err);
		const stack = err instanceof Error ? err.stack : undefined;
		this.setStatus({ code: 2, message });
		this.addEvent('exception', {
			'exception.type': err instanceof Error ? err.name : 'Error',
			'exception.message': message,
			...(stack ? { 'exception.stacktrace': stack } : {})
		});
		return this;
	}

	addEvent(name: string, attributes?: SpanAttributes): this {
		this.events.push({
			name,
			timeUnixNano: toUnixNano(Date.now()),
			attributes
		});
		return this;
	}

	end(endTimeMs?: number): this {
		if (this.isEnded) return this;
		this.endTimeUnixNano = toUnixNano(endTimeMs ?? Date.now());
		this.isEnded = true;
		return this;
	}
}

export class WorkerTracer {
	public readonly traceId: string;
	public readonly rootParentSpanId?: string;
	public activeParentSpanId?: string;
	public readonly environment: string;
	public readonly serviceName: string;
	public readonly serviceVersion: string;
	public readonly projectName: string;
	public readonly endpoint: string;
	public readonly apiKey?: string;
	public readonly spans: WorkerSpan[] = [];

	constructor(config: TracerConfig = {}) {
		this.traceId = config.traceId || generateTraceId();
		this.rootParentSpanId = config.parentSpanId;
		this.activeParentSpanId = config.parentSpanId;
		this.environment = config.environment || 'production';
		this.serviceName = config.serviceName || 'maniyy-agent';
		this.serviceVersion = config.serviceVersion || '0.0.1';
		this.projectName = config.projectName || `maniyy-agent-${this.environment}`;
		this.endpoint = (config.endpoint || 'https://phoenix.membran.app/v1/traces').replace(/\/+$/, '');
		this.apiKey = config.apiKey || 'phx_adm_sec_e4b1c2d3f4a5b6c7_sec';
	}

	setActiveParentSpan(spanId?: string): void {
		this.activeParentSpanId = spanId;
	}

	startSpan(
		name: string,
		options: {
			parentSpanId?: string;
			kind?: number;
			attributes?: SpanAttributes;
			startTimeMs?: number;
		} = {}
	): WorkerSpan {
		const spanId = generateSpanId();
		const parentSpanId = options.parentSpanId ?? this.activeParentSpanId ?? this.rootParentSpanId;
		const span = new WorkerSpan({
			traceId: this.traceId,
			spanId,
			name,
			parentSpanId,
			kind: options.kind,
			startTimeMs: options.startTimeMs,
			attributes: options.attributes
		});

		this.spans.push(span);
		return span;
	}

	private formatAttributeValue(val: string | number | boolean): Record<string, unknown> {
		if (typeof val === 'string') return { stringValue: val };
		if (typeof val === 'boolean') return { boolValue: val };
		if (typeof val === 'number') {
			if (Number.isInteger(val)) return { intValue: String(val) };
			return { doubleValue: val };
		}
		return { stringValue: String(val) };
	}

	toOTLPPayload(): Record<string, unknown> {
		const formattedSpans = this.spans.map((s) => ({
			traceId: s.traceId,
			spanId: s.spanId,
			parentSpanId: s.parentSpanId,
			name: s.name,
			kind: s.kind,
			startTimeUnixNano: s.startTimeUnixNano,
			endTimeUnixNano: s.endTimeUnixNano || s.startTimeUnixNano,
			attributes: Object.entries(s.attributes).map(([key, val]) => ({
				key,
				value: this.formatAttributeValue(val)
			})),
			events: s.events.map((e) => ({
				name: e.name,
				timeUnixNano: e.timeUnixNano,
				attributes: e.attributes
					? Object.entries(e.attributes).map(([key, val]) => ({
							key,
							value: this.formatAttributeValue(val ?? '')
						}))
					: []
			})),
			status: {
				code: s.status.code,
				message: s.status.message
			}
		}));

		return {
			resourceSpans: [
				{
					resource: {
						attributes: [
							{ key: 'service.name', value: { stringValue: this.serviceName } },
							{ key: 'service.version', value: { stringValue: this.serviceVersion } },
							{ key: 'deployment.environment', value: { stringValue: this.environment } },
							{ key: 'project.name', value: { stringValue: this.projectName } },
							{ key: 'openinference.project.name', value: { stringValue: this.projectName } }
						]
					},
					scopeSpans: [
						{
							scope: {
								name: 'maniyy-agent-worker',
								version: this.serviceVersion
							},
							spans: formattedSpans
						}
					]
				}
			]
		};
	}

	async flush(): Promise<void> {
		if (this.spans.length === 0) return;

		// Ensure all spans are ended
		for (const span of this.spans) {
			span.end();
		}

		const resource = {
			attributes: {
				'service.name': this.serviceName,
				'service.version': this.serviceVersion,
				'deployment.environment': this.environment,
				'project.name': this.projectName,
				'openinference.project.name': this.projectName
			}
		};
		const instrumentationScope = {
			name: 'maniyy-agent-worker',
			version: this.serviceVersion
		};

		const readableSpans = this.spans.map((s) => {
			const startNs = BigInt(s.startTimeUnixNano);
			const endNs = BigInt(s.endTimeUnixNano || s.startTimeUnixNano);
			return {
				name: s.name,
				kind: s.kind,
				spanContext: () => ({
					traceId: s.traceId,
					spanId: s.spanId,
					traceFlags: 1
				}),
				parentSpanContext: s.parentSpanId
					? {
							traceId: s.traceId,
							spanId: s.parentSpanId,
							traceFlags: 1,
							isRemote: false
						}
					: undefined,
				startTime: [Number(startNs / 1_000_000_000n), Number(startNs % 1_000_000_000n)] as [number, number],
				endTime: [Number(endNs / 1_000_000_000n), Number(endNs % 1_000_000_000n)] as [number, number],
				attributes: s.attributes,
				events: s.events.map((e) => {
					const eNs = BigInt(e.timeUnixNano);
					return {
						name: e.name,
						time: [Number(eNs / 1_000_000_000n), Number(eNs % 1_000_000_000n)] as [number, number],
						attributes: e.attributes
					};
				}),
				links: [],
				status: { code: s.status.code, message: s.status.message },
				droppedAttributesCount: 0,
				droppedEventsCount: 0,
				droppedLinksCount: 0,
				resource,
				instrumentationScope
			};
		});

		type SerializerInput = Parameters<typeof ProtobufTraceSerializer.serializeRequest>[0];
		const protobufBytes = ProtobufTraceSerializer.serializeRequest(readableSpans as unknown as SerializerInput);

		const headers: Record<string, string> = {
			'Content-Type': 'application/x-protobuf',
			'x-project-name': this.projectName,
			'x-phoenix-project': this.projectName
		};

		if (this.apiKey) {
			headers['Authorization'] = `Bearer ${this.apiKey}`;
		}

		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 3000);

			const res = await fetch(this.endpoint, {
				method: 'POST',
				headers,
				body: protobufBytes,
				signal: controller.signal
			});

			clearTimeout(timeoutId);

			if (!res.ok) {
				console.warn(`[Tracer] Failed to export traces to Phoenix: ${res.status} ${res.statusText}`);
			}
		} catch (err) {
			console.warn('[Tracer] Network error exporting traces to Phoenix:', err);
		}
	}

	flushWithWaitUntil(executionCtx?: { waitUntil: (promise: Promise<unknown>) => void }): void {
		if (executionCtx && typeof executionCtx.waitUntil === 'function') {
			executionCtx.waitUntil(this.flush());
		} else {
			// Detached background invocation
			void this.flush();
		}
	}
}
