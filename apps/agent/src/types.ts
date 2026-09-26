/// <reference types="@cloudflare/workers-types" />

export interface Env {
	DB: D1Database;
	CONFIG: KVNamespace;
	REEDRICH?: Fetcher;
	REEDRICH_API_URL: string;
	GEMINI_API_KEY: string;
	GROQ_API_KEY: string;
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
	}
}
