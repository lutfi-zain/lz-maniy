import {
	buildOpenInferenceToolAttributes,
	popActiveTraceContext,
	pushActiveTraceContext,
	sanitizeTracePayload,
	type WorkerTracer
} from './tracer.js';

export interface ToolDefinition<TArgs = unknown, TResult = unknown> {
	description?: string;
	parameters?: unknown;
	execute: (args: TArgs, options?: unknown) => Promise<TResult> | TResult;
}
export interface WrapToolsOptions {
	includeSubSpans?: boolean;
	onToolResult?: (toolName: string, args: unknown, result: unknown) => void;
}

export function wrapToolsWithTracing<T extends Record<string, unknown>>(
	tools: T,
	tracer?: WorkerTracer,
	wrapOptions?: WrapToolsOptions
): T {
	if (!tracer && !wrapOptions?.onToolResult) return tools;

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
				const toolObj = toolDef as ToolDefinition;
				const toolAttrs = tracer
					? buildOpenInferenceToolAttributes({
							name: toolName,
							description: toolObj.description,
							parametersSchema:
								typeof toolObj.parameters === 'object' && toolObj.parameters !== null
									? (toolObj.parameters as Record<string, unknown>)
									: undefined,
							args
					  })
					: undefined;
				const sanitizedArgs = toolAttrs ? String(toolAttrs['input.value'] ?? '{}') : '{}';

				const toolSpan = tracer?.startSpan(`tool:${toolName}`, {
					kind: 1, // INTERNAL
					attributes: toolAttrs
				});

				const startTime = Date.now();
				const rpcSpan =
					wrapOptions?.includeSubSpans && tracer && toolSpan
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

				if (tracer && toolSpan) {
					pushActiveTraceContext({
						traceId: tracer.traceId,
						spanId: (rpcSpan ?? toolSpan).spanId,
						projectName: tracer.projectName
					});
				}
				try {
					const result = await executeFn(args, options);
					const durationMs = Date.now() - startTime;
					try {
						wrapOptions?.onToolResult?.(toolName, args, result);
					} catch (hookErr) {
						console.warn(`[wrapToolsWithTracing] onToolResult hook failed for ${toolName}:`, hookErr);
					}
					if (toolSpan) {
						try {
							const serialized = sanitizeTracePayload(result, { isOutput: true }).slice(0, 2000);
							toolSpan.setAttribute('output.value', serialized);
							rpcSpan?.setAttribute('output.value', serialized);
						} catch {}
						toolSpan.setAttribute('tool.duration_ms', durationMs);
						rpcSpan?.setAttribute('rpc.duration_ms', durationMs);
						toolSpan.setStatus({ code: 1 });
						rpcSpan?.setStatus({ code: 1 });
					}
					return result;
				} catch (err) {
					const durationMs = Date.now() - startTime;
					if (toolSpan) {
						toolSpan.setAttribute('tool.duration_ms', durationMs);
						rpcSpan?.setAttribute('rpc.duration_ms', durationMs);
						toolSpan.recordException(err);
						rpcSpan?.recordException(err);
					}
					throw err;
				} finally {
					if (tracer && toolSpan) {
						popActiveTraceContext();
						rpcSpan?.end();
						toolSpan.end();
					}
				}
			}
		};
	}

	return wrapped as unknown as T;
}
