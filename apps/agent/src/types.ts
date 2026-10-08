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
