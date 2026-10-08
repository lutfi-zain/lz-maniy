import type { WorkerTracer } from './tracer.js';

export interface ToolDefinition<TArgs = unknown, TResult = unknown> {
	description?: string;
	parameters?: unknown;
	execute: (args: TArgs, options?: unknown) => Promise<TResult> | TResult;
}

export function wrapToolsWithTracing<T extends Record<string, unknown>>(
	tools: T,
	tracer?: WorkerTracer,
	wrapOptions?: { includeSubSpans?: boolean }
): T {
	if (!tracer) return tools;

	const wrapped: Record<string, unknown> = {};

	for (const [toolName, toolDef] of Object.entries(tools)) {
		if (!toolDef || typeof toolDef !== 'object' || !('execute' in toolDef)) {
			wrapped[toolName] = toolDef;
			continue;
		}

		const executeFn = toolDef.execute;
		if (typeof executeFn !== 'function') {
			wrapped[toolName] = toolDef;
			continue;
		}

		wrapped[toolName] = {
			...toolDef,
			execute: async (args: unknown, options?: unknown) => {
				let sanitizedArgs = '';
				try {
					sanitizedArgs = typeof args === 'object' && args !== null ? JSON.stringify(args) : String(args);
				} catch {
					sanitizedArgs = '[unserializable]';
				}

				const toolSpan = tracer.startSpan(`tool:${toolName}`, {
					kind: 1, // INTERNAL
					attributes: {
						'openinference.span.kind': 'TOOL',
						'tool.name': toolName,
						'tool.args': sanitizedArgs,
						'tool.parameters': sanitizedArgs,
						'input.value': sanitizedArgs
					}
				});

				const startTime = Date.now();
				const rpcSpan = wrapOptions?.includeSubSpans
					? tracer.startSpan(`reedrich.rpc:${toolName}`, {
							parentSpanId: toolSpan.spanId,
							kind: 3, // CLIENT
							attributes: {
								'rpc.system': 'reedrich-edge-mcp',
								'rpc.method': toolName,
								'input.value': sanitizedArgs
							}
						})
					: undefined;

				try {
					const result = await executeFn(args, options);
					const durationMs = Date.now() - startTime;
					try {
						const serialized = JSON.stringify(result).slice(0, 2000);
						toolSpan.setAttribute('output.value', serialized);
						rpcSpan?.setAttribute('output.value', serialized);
					} catch {}
					toolSpan.setAttribute('tool.duration_ms', durationMs);
					rpcSpan?.setAttribute('rpc.duration_ms', durationMs);
					toolSpan.setStatus({ code: 1 });
					rpcSpan?.setStatus({ code: 1 });
					return result;
				} catch (err) {
					const durationMs = Date.now() - startTime;
					toolSpan.setAttribute('tool.duration_ms', durationMs);
					rpcSpan?.setAttribute('rpc.duration_ms', durationMs);
					toolSpan.recordException(err);
					rpcSpan?.recordException(err);
					throw err;
				} finally {
					rpcSpan?.end();
					toolSpan.end();
				}
			}
		};
	}

	return wrapped as unknown as T;
}
