import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { getUserSettings, upsertUserSettings } from '../db/queries.js';
import type { Env } from '../types.js';
import type { UserSettings } from '@maniy/shared';

export const settingsRouter = new Hono<{ Bindings: Env }>();

settingsRouter.use('*', authMiddleware);

// GET /api/settings
settingsRouter.get('/', async (c) => {
	const user = c.get('user');
	const settings = await getUserSettings(c.env.DB, user.userId);
	return c.json(settings);
});

// PUT /api/settings
settingsRouter.put('/', async (c) => {
	const user = c.get('user');
	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: 'invalid_json', message: 'Request body must be valid JSON' }, 400);
	}

	if (!body || typeof body !== 'object' || Array.isArray(body)) {
		return c.json({ error: 'invalid_payload', message: 'Request body must be a JSON object' }, 400);
	}

	const partial = body as Partial<UserSettings>;

	// Validate fields if provided
	if (
		partial.ledgerViewMode !== undefined &&
		partial.ledgerViewMode !== 'single' &&
		partial.ledgerViewMode !== 'calendar_board'
	) {
		return c.json(
			{
				error: 'invalid_payload',
				message: 'ledgerViewMode must be "single" or "calendar_board"'
			},
			400
		);
	}

	if (partial.activePeriods !== undefined) {
		if (
			!Array.isArray(partial.activePeriods) ||
			!partial.activePeriods.every((p) => typeof p === 'string' && /^\d{4}-\d{2}$/.test(p))
		) {
			return c.json(
				{
					error: 'invalid_payload',
					message: 'activePeriods must be an array of YYYY-MM formatted strings'
				},
				400
			);
		}
	}

	const updated = await upsertUserSettings(c.env.DB, user.userId, partial);
	return c.json(updated);
});
