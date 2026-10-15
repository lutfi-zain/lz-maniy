import type { WorkerTracer } from './observability/tracer.js';

/// <reference types="@cloudflare/workers-types" />

export interface Env {
	DB: D1Database;
	CONFIG: KVNamespace;
	REEDRICH?: Fetcher;
	REEDRICH_API_URL: string;
	GEMINI_API_KEY: string;
	GROQ_API_KEY: string;
	OPENCODE_API_KEY?: string;
	OMP_GATEWAY_KEY?: string;
	OMP_GATEWAY_URL?: string;
	PHOENIX_ENDPOINT?: string;
	PHOENIX_API_KEY?: string;
	PHOENIX_PROJECT_NAME?: string;
	ENVIRONMENT?: string;
	LANGFUSE_PUBLIC_KEY?: string;
	LANGFUSE_SECRET_KEY?: string;
	LANGFUSE_BASE_URL?: string;
	LANGFUSE_ENABLED?: string;
	LANGFUSE_USER_FEEDBACK_CONFIG_ID?: string;
	TELEGRAM_BOT_TOKEN?: string;
	TELEGRAM_ALERT_CHAT_ID?: string;
}

export interface ChatFeedbackPayload {
	messageId: string;
	conversationId: string;
	score: number; // 1 for positive (thumbs up), 0 for negative (thumbs down)
	reason?: string;
	traceId?: string;
}

export interface AuthedUser {
	userId: string;
	email: string;
	fullName: string;
	accessToken: string;
}

// Augment Hono context variables
declare module 'hono' {
	interface ContextVariableMap {
		user: AuthedUser;
		tracer: WorkerTracer;
	}
}
