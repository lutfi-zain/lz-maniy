import { Hono } from 'hono';
import { AVAILABLE_MODELS } from '../agent/models.js';
import type { Env } from '../types.js';

const modelsRouter = new Hono<{ Bindings: Env }>();

modelsRouter.get('/', (c) => {
	return c.json(AVAILABLE_MODELS);
});

export { modelsRouter };
