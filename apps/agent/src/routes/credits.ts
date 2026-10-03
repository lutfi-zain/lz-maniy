import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { getOrCreateUserCredits, listCreditTransactions } from '../db/credits.js';
import type { Env } from '../types.js';

const creditsRouter = new Hono<{ Bindings: Env }>();

creditsRouter.use('*', authMiddleware);

// GET /api/credits - Current balance
creditsRouter.get('/', async (c) => {
	const user = c.get('user');
	const balance = await getOrCreateUserCredits(c.env.DB, user.userId);
	return c.json(balance);
});

// GET /api/credits/history - Transaction ledger
creditsRouter.get('/history', async (c) => {
	const user = c.get('user');
	const limitParam = c.req.query('limit');
	const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam, 10))) : 50;
	const transactions = await listCreditTransactions(c.env.DB, user.userId, limit);
	return c.json(transactions);
});

export { creditsRouter };
