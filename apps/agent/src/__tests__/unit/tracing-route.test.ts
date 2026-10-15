import { describe, it, expect } from 'vitest';
import { WorkerTracer } from '../../observability/tracer.js';
import { wrapToolsWithTracing } from '../../observability/instrument-tools.js';

describe('Tool Tracing Instrumentation & Error Handling', () => {
	it('instruments tool execution and generates tool span with attributes', async () => {
		const tracer = new WorkerTracer({
			serviceName: 'maniy-agent',
			environment: 'test'
		});

		const rawTools = {
			get_snapshot: {
				description: 'Fetch snapshot',
				execute: async (args: { walletId: string }) => {
					return { balance: 5000000, walletId: args.walletId };
				}
			}
		};

		const instrumented = wrapToolsWithTracing(rawTools, tracer);
		const result = await instrumented.get_snapshot.execute({ walletId: 'w_bca' });

		expect(result).toEqual({ balance: 5000000, walletId: 'w_bca' });

		expect(tracer.spans).toHaveLength(1);
		const span = tracer.spans[0];
		expect(span.name).toBe('tool:get_snapshot');
		expect(span.attributes['tool.name']).toBe('get_snapshot');
		expect(span.attributes['tool.args']).toContain('w_bca');
		expect(span.attributes['tool.duration_ms']).toBeDefined();
		expect(span.status.code).toBe(1); // OK
	});
	it('notifies onToolResult callback immediately upon tool completion', async () => {
		const tracer = new WorkerTracer({
			serviceName: 'maniy-agent',
			environment: 'test'
		});

		const rawTools = {
			get_snapshot: {
				description: 'Fetch snapshot',
				execute: async (args: { walletId: string }) => {
					return { balance: 5000000, walletId: args.walletId };
				}
			}
		};

		const captured: Array<{ toolName: string; args: unknown; result: unknown }> = [];
		const instrumented = wrapToolsWithTracing(rawTools, tracer, {
			onToolResult: (toolName, args, result) => {
				captured.push({ toolName, args, result });
			}
		});

		const result = await instrumented.get_snapshot.execute({ walletId: 'w_jago' });
		expect(result).toEqual({ balance: 5000000, walletId: 'w_jago' });
		expect(captured).toHaveLength(1);
		expect(captured[0]).toEqual({
			toolName: 'get_snapshot',
			args: { walletId: 'w_jago' },
			result: { balance: 5000000, walletId: 'w_jago' }
		});
	});


	it('records exception on tool span when tool execution fails', async () => {
		const tracer = new WorkerTracer({
			serviceName: 'maniy-agent',
			environment: 'test'
		});

		const rawTools = {
			create_transaction: {
				description: 'Create transaction mutation',
				execute: async () => {
					throw new Error('Database connection timeout in test');
				}
			}
		};

		const instrumented = wrapToolsWithTracing(rawTools, tracer);

		await expect(
			instrumented.create_transaction.execute({ amount: 150000 })
		).rejects.toThrow('Database connection timeout in test');

		expect(tracer.spans).toHaveLength(1);
		const span = tracer.spans[0];
		expect(span.name).toBe('tool:create_transaction');
		expect(span.status.code).toBe(2); // ERROR
		expect(span.status.message).toBe('Database connection timeout in test');
		expect(span.events).toHaveLength(1);
		expect(span.events[0].name).toBe('exception');
	});

	it('defaults openinference.span.kind to CHAIN and status.code to OK (1) on end() to prevent UNKNOWN/UNSET spans', () => {
		const tracer = new WorkerTracer({
			serviceName: 'maniy-agent',
			environment: 'test'
		});

		const span = tracer.startSpan('customInternalStep');
		span.end();

		expect(span.attributes['openinference.span.kind']).toBe('CHAIN');
		expect(span.status.code).toBe(1);
	});

	it('supports deferFlush() for streaming responses', () => {
		const tracer = new WorkerTracer({
			serviceName: 'maniy-agent',
			environment: 'test'
		});

		expect(tracer.isFlushDeferred).toBe(false);
		tracer.deferFlush();
		expect(tracer.isFlushDeferred).toBe(true);
	});
});
