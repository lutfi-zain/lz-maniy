/// <reference types="@cloudflare/workers-types" />
import type { MiddlewareHandler } from 'hono';
import type { Env } from '../types.js';

export const authMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
	const authHeader = c.req.header('Authorization');
	if (!authHeader?.startsWith('Bearer ')) {
		return c.json({ error: 'unauthorized', message: 'Missing Authorization header' }, 401);
	}
	const token = authHeader.slice(7);

	let profile: { userId: string; email: string; fullName: string };
	try {
		const url = `${c.env.REEDRICH_API_URL}/api/v1/me`;
		const headers = {
			Authorization: `Bearer ${token}`,
			'X-Api-Key': token
		};
		// Always use global fetch if REEDRICH service binding is not locally connected
		let res: Response;
		try {
			if (c.env.REEDRICH) {
				res = await c.env.REEDRICH.fetch(new Request(url, { headers }));
			} else {
				res = await fetch(url, { headers });
			}
		} catch (fetchErr: unknown) {
			console.error('authMiddleware fetch error:', fetchErr);
			return c.json({ error: 'unauthorized', message: 'Failed to connect to authentication provider' }, 401);
		}
		if (!res.ok) {
			return c.json(
				{ error: 'unauthorized', message: 'Invalid or expired Reedrich session' },
				401
			);
		}
		profile = (await res.json()) as { userId: string; email: string; fullName: string };
	} catch (err: unknown) {
		console.error('authMiddleware generic error:', err);
		return c.json({ error: 'unauthorized', message: 'Auth validation failed' }, 401);
	}
	c.set('user', {
		userId: profile.userId,
		email: profile.email,
		fullName: profile.fullName,
		accessToken: token
	});
	await next();
};
