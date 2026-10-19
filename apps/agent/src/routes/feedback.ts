import { Hono } from 'hono';
import type { Env } from '../types.js';
import { authMiddleware } from '../middleware/auth.js';
import { sendTelegramAlert } from '../observability/alerts.js';
import { enqueueEvalJob } from '../db/queries.js';

export const feedbackRouter = new Hono<{ Bindings: Env }>();

feedbackRouter.use('*', authMiddleware);

/**
 * Ensure the feedbacks table exists in D1
 */
async function ensureFeedbackTable(db: D1Database): Promise<void> {
	await db
		.prepare(
			`CREATE TABLE IF NOT EXISTS feedbacks (
				id TEXT PRIMARY KEY,
				user_id TEXT NOT NULL,
				conversation_id TEXT NOT NULL,
				message_id TEXT NOT NULL,
				score REAL NOT NULL,
				reason TEXT,
				trace_id TEXT,
				created_at INTEGER NOT NULL
			)`
		)
		.run();
}

/**
 * Stream feedback score to Langfuse Cloud
 */
async function streamToLangfuse(
	env: Env,
	feedback: {
		score: number;
		reason?: string;
		traceId?: string;
		sessionId: string;
	}
): Promise<void> {
	if (env.LANGFUSE_ENABLED === 'false') return;
	const pub = env.LANGFUSE_PUBLIC_KEY;
	const sec = env.LANGFUSE_SECRET_KEY;
	if (!pub || !sec) return;

	const baseUrl = (env.LANGFUSE_BASE_URL || 'https://us.cloud.langfuse.com').replace(/\/+$/, '');
	const authHeader = `Basic ${btoa(`${pub}:${sec}`)}`;

	try {
		await fetch(`${baseUrl}/api/public/scores`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: authHeader
			},
			body: JSON.stringify({
				name: 'user_feedback',
				value: feedback.score >= 1.0 ? 'positive' : 'negative',
				comment: feedback.reason,
				traceId: feedback.traceId,
				sessionId: feedback.sessionId,
				dataType: 'CATEGORICAL',
				configId: env.LANGFUSE_USER_FEEDBACK_CONFIG_ID || undefined
			})
		});
	} catch (err) {
		console.warn('[Feedback] Failed to stream score to Langfuse:', err);
	}
}

/**
 * Stream feedback annotation to Arize Phoenix
 */
async function streamToPhoenix(
	env: Env,
	feedback: {
		score: number;
		reason?: string;
		traceId?: string;
		sessionId: string;
	}
): Promise<void> {
	const endpoint = env.PHOENIX_ENDPOINT || 'https://phoenix.membran.app/v1/traces';
	const baseUrl = endpoint.replace(/\/v1\/traces\/?$/, '').replace(/\/+$/, '');
	const apiKey = env.PHOENIX_API_KEY || 'phx_adm_sec_e4b1c2d3f4a5b6c7_sec';
	const projectName = env.PHOENIX_PROJECT_NAME || `maniyy-agent-${env.ENVIRONMENT || 'production'}`;

	try {
		// 1. Session annotation
		await fetch(`${baseUrl}/v1/project_session_annotations`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`
			},
			body: JSON.stringify({
				project_name: projectName,
				session_id: feedback.sessionId,
				name: 'user_feedback',
				annotator_kind: 'HUMAN',
				score: feedback.score,
				label: feedback.score >= 0.5 ? 'positive' : 'negative',
				explanation: feedback.reason || (feedback.score >= 0.5 ? 'User thumbs up' : 'User thumbs down')
			})
		});

		// 2. Span/Trace annotation if traceId is provided
		if (feedback.traceId) {
			await fetch(`${baseUrl}/v1/span_annotations`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${apiKey}`
				},
				body: JSON.stringify({
					span_id: feedback.traceId,
					name: 'user_feedback',
					annotator_kind: 'HUMAN',
					score: feedback.score,
					label: feedback.score >= 0.5 ? 'positive' : 'negative',
					explanation: feedback.reason
				})
			});
		}
	} catch (err) {
		console.warn('[Feedback] Failed to stream annotation to Phoenix:', err);
	}
}

feedbackRouter.post('/', async (c) => {
	const user = c.get('user');
	const body = await c.req.json<{
		messageId: string;
		conversationId: string;
		score: number; // 1 for thumbs up, 0 for thumbs down
		reason?: string;
		traceId?: string;
	}>();

	if (!body.messageId || !body.conversationId || typeof body.score !== 'number') {
		return c.json({ error: 'messageId, conversationId, and numeric score are required' }, 400);
	}

	const feedbackId = `fb_${crypto.randomUUID()}`;
	const now = Date.now();

	// 1. Verify tenant ownership of the message
	let messageRow: { content: string | null; role: string; tool_results: string | null } | null = null;
	try {
		messageRow = await c.env.DB.prepare(
			`SELECT m.content, m.role, m.tool_results
			 FROM messages m
			 JOIN conversations c ON m.conversation_id = c.id
			 WHERE m.id = ? AND c.id = ? AND c.user_id = ?`
		)
			.bind(body.messageId, body.conversationId, user.userId)
			.first<{ content: string | null; role: string; tool_results: string | null }>();

		if (!messageRow) {
			return c.json({ error: 'Message not found or unauthorized' }, 403);
		}
	} catch (err) {
		console.error('[Feedback] Ownership verification error:', err);
		return c.json({ error: 'Failed to verify message ownership' }, 500);
	}

	// 2. Persist to D1
	try {
		await ensureFeedbackTable(c.env.DB);
		await c.env.DB.prepare(
			`INSERT INTO feedbacks (id, user_id, conversation_id, message_id, score, reason, trace_id, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
		)
			.bind(feedbackId, user.userId, body.conversationId, body.messageId, body.score, body.reason ?? null, body.traceId ?? null, now)
			.run();
	} catch (err) {
		console.error('[Feedback] Database insertion error:', err);
		return c.json({ error: 'Failed to record feedback' }, 500);
	}

	// 2. Asynchronously stream to Langfuse & Phoenix, and trigger Telegram alert on negative rating
	const executionPromise = (async () => {
		await Promise.allSettled([
			streamToLangfuse(c.env, {
				score: body.score,
				reason: body.reason,
				traceId: body.traceId,
				sessionId: body.conversationId
			}),
			streamToPhoenix(c.env, {
				score: body.score,
				reason: body.reason,
				traceId: body.traceId,
				sessionId: body.conversationId
			})
		]);

		// Alert trigger on negative feedback
		// Alert and queue trigger on negative feedback
		if (body.score < 0.5) {
			await sendTelegramAlert(c.env, {
				title: 'User Negative Feedback (👎)',
				sessionId: body.conversationId,
				userId: user.userId,
				score: body.score,
				reason: body.reason || 'User marked message with Thumbs Down',
				phoenixTraceId: body.traceId
			});

			try {
				let userPrompt = 'Negative feedback turn';
				const prevMsg = await c.env.DB.prepare(
					`SELECT content FROM messages
					 WHERE conversation_id = ? AND role = 'user'
					 ORDER BY created_at DESC LIMIT 1`
				)
					.bind(body.conversationId)
					.first<{ content: string }>();
				if (prevMsg?.content) {
					userPrompt = prevMsg.content;
				}

				await enqueueEvalJob(c.env.DB, {
					traceId: body.traceId || crypto.randomUUID(),
					sessionId: body.conversationId,
					userId: user.userId,
					priority: 'high',
					userMessage: userPrompt,
					assistantOutput: messageRow?.content || '',
					toolResultsJson: messageRow?.tool_results,
					triggerReason: 'negative_feedback'
				});
			} catch (queueErr) {
				console.warn('[Feedback] Failed to enqueue negative feedback for async eval:', queueErr);
			}
		}
	})();

	if (c.executionCtx && typeof c.executionCtx.waitUntil === 'function') {
		c.executionCtx.waitUntil(executionPromise);
	}

	return c.json({
		success: true,
		id: feedbackId,
		score: body.score
	});
});
