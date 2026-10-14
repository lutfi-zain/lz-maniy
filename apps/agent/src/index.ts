/// <reference types="@cloudflare/workers-types" />
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { tracingMiddleware } from './middleware/tracing.js';
import { modelsRouter } from './routes/models.js';
import { conversationsRouter } from './routes/conversations.js';
import { chatRouter } from './routes/chat.js';
import { settingsRouter } from './routes/settings.js';
import { creditsRouter } from './routes/credits.js';
import { statementsRouter } from './routes/statements.js';
import { feedbackRouter } from './routes/feedback.js';

const app = new Hono<{ Bindings: Env }>();

// Global error handler to surface exact stack trace in JSON response
app.onError((err, c) => {
	console.error('Unhandled app error:', err);
	return c.json({
		error: 'internal_server_error',
		message: err.message,
		stack: err.stack
	}, 500);
});

// CORS — allow apps/web origins in dev and prod
app.use(
	'*',
	cors({
		origin: (origin) => {
			if (!origin) return '*';
			if (
				origin === 'http://localhost:5173' ||
				origin === 'http://localhost:4173' ||
				origin === 'https://maniy.membran.app' ||
				origin === 'https://maniyy.membran.app' ||
				origin === 'https://maniyy2.pages.dev' ||
				origin.endsWith('.maniyy2.pages.dev') ||
				origin.endsWith('.pages.dev') ||
				origin === 'https://maniy.lutfidmz.workers.dev' ||
				origin === 'https://maniy-agent.lutfidmz.workers.dev' ||
				origin === 'https://maniyy.lutfidmz.workers.dev' ||
				origin === 'https://maniyy-agent.lutfidmz.workers.dev'
			) {
				return origin;
			}
			return null;
		},
		allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
		allowHeaders: ['Content-Type', 'Authorization', 'X-Api-Key', 'traceparent'],
		exposeHeaders: ['X-Conversation-Id', 'X-Is-New-Conversation', 'traceparent', 'X-Trace-Id'],
		credentials: true
	})
);

app.use('*', tracingMiddleware);

app.route('/api/models', modelsRouter);
app.route('/api/conversations', conversationsRouter);
app.route('/api/chat', chatRouter);
app.route('/api/settings', settingsRouter);
app.route('/api/credits', creditsRouter);
app.route('/api/statements', statementsRouter);
app.route('/api/chat/feedback', feedbackRouter);

// Health check
app.get('/', (c) => c.json({ status: 'ok', service: 'maniyy-agent' }));

export default app;
