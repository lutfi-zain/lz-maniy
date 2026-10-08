import type { MiddlewareHandler } from 'hono';
import type { Env } from '../types.js';
import { WorkerTracer, parseTraceParent, formatTraceParent } from '../observability/tracer.js';

export const tracingMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
	const rawTraceParent = c.req.header('traceparent');
	const parsed = parseTraceParent(rawTraceParent);

	const environment = c.env.ENVIRONMENT || 'production';
	const projectName = c.env.PHOENIX_PROJECT_NAME || `maniyy-agent-${environment}`;
	const endpoint = c.env.PHOENIX_ENDPOINT || 'https://phoenix.membran.app/v1/traces';
	const apiKey = c.env.PHOENIX_API_KEY || 'phx_adm_sec_e4b1c2d3f4a5b6c7_sec';

	const tracer = new WorkerTracer({
		endpoint,
		apiKey,
		environment,
		projectName,
		serviceName: 'maniyy-agent',
		traceId: parsed?.traceId,
		parentSpanId: parsed?.parentSpanId
	});

	c.set('tracer', tracer);

	const rootSpan = tracer.startSpan(`HTTP ${c.req.method} ${c.req.path}`, {
		kind: 2, // SERVER
		attributes: {
			'openinference.span.kind': 'CHAIN',
			'http.method': c.req.method,
			'http.url': c.req.url,
			'http.route': c.req.path,
			'http.user_agent': c.req.header('user-agent') || 'unknown'
		}
	});
	tracer.setActiveParentSpan(rootSpan.spanId);
	try {
		await next();
		rootSpan.setAttribute('http.status_code', c.res.status);
		if (c.res.status >= 400) {
			rootSpan.setStatus({ code: 2, message: `HTTP status ${c.res.status}` });
		} else {
			rootSpan.setStatus({ code: 1 });
		}
	} catch (err) {
		rootSpan.recordException(err);
		throw err;
	} finally {
		rootSpan.end();
		c.res.headers.set('traceparent', formatTraceParent(tracer.traceId, rootSpan.spanId));
		c.res.headers.set('X-Trace-Id', tracer.traceId);
		tracer.flushWithWaitUntil(c.executionCtx);
	}
};
