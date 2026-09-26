/// <reference types="@cloudflare/workers-types" />
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { modelsRouter } from './routes/models.js';
import { conversationsRouter } from './routes/conversations.js';
import { chatRouter } from './routes/chat.js';
import type { Env } from './types.js';

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
		origin: [
			'http://localhost:5173',
			'http://localhost:4173',
			'https://maniyy2.pages.dev',
			'https://maniyy.lutfidmz.workers.dev'
		],
		allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
		allowHeaders: ['Content-Type', 'Authorization', 'X-Api-Key'],
		exposeHeaders: ['X-Conversation-Id', 'X-Is-New-Conversation'],
		credentials: true
	})
);

app.route('/api/models', modelsRouter);
app.route('/api/conversations', conversationsRouter);
app.route('/api/chat', chatRouter);

// Health check
app.get('/', (c) => c.json({ status: 'ok', service: 'maniyy-agent' }));

export default app;
