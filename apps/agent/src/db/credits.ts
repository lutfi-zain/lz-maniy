/// <reference types="@cloudflare/workers-types" />
import type { CreditBalance, CreditTransaction, CreditPricing } from '@maniy/shared';

export const DEFAULT_CREDIT_BALANCE = 2000;
export const CREDIT_VALUE_USD = 0.0005; // 1 credit = $0.0005 ($1 = 2000 credits)

export const FALLBACK_PRICING: CreditPricing = {
	model: 'default',
	inputPerMillion: 0.75,
	outputPerMillion: 3.75
};

export async function getOrCreateUserCredits(
	db: D1Database,
	userId: string
): Promise<CreditBalance> {
	const row = await db
		.prepare('SELECT balance, lifetime_used FROM user_credits WHERE user_id = ?')
		.bind(userId)
		.first<{ balance: number; lifetime_used: number }>();

	if (row) {
		return {
			balance: row.balance,
			lifetimeUsed: row.lifetime_used,
			defaultBalance: DEFAULT_CREDIT_BALANCE,
			creditValueUsd: CREDIT_VALUE_USD
		};
	}

	const now = Date.now();
	await db
		.prepare(
			'INSERT OR IGNORE INTO user_credits (user_id, balance, lifetime_used, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
		)
		.bind(userId, DEFAULT_CREDIT_BALANCE, 0, now, now)
		.run();

	return {
		balance: DEFAULT_CREDIT_BALANCE,
		lifetimeUsed: 0,
		defaultBalance: DEFAULT_CREDIT_BALANCE,
		creditValueUsd: CREDIT_VALUE_USD
	};
}

export async function deductCredits(
	db: D1Database,
	userId: string,
	credits: number
): Promise<number> {
	const now = Date.now();
	const res = await db
		.prepare(
			'UPDATE user_credits SET balance = balance - ?, lifetime_used = lifetime_used + ?, updated_at = ? WHERE user_id = ? RETURNING balance'
		)
		.bind(credits, credits, now, userId)
		.first<{ balance: number }>();

	return res ? res.balance : 0;
}

export async function recordCreditTransaction(
	db: D1Database,
	tx: {
		userId: string;
		model: string;
		inputTokens: number;
		outputTokens: number;
		creditsUsed: number;
		conversationId?: string;
	}
): Promise<string> {
	const id = crypto.randomUUID();
	const now = Date.now();
	await db
		.prepare(
			`INSERT INTO credit_transactions (
				id, user_id, model, input_tokens, output_tokens, credits_used, conversation_id, created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			id,
			tx.userId,
			tx.model,
			tx.inputTokens,
			tx.outputTokens,
			tx.creditsUsed,
			tx.conversationId ?? null,
			now
		)
		.run();

	return id;
}

export async function getCreditPricing(
	db: D1Database,
	model: string
): Promise<CreditPricing> {
	const row = await db
		.prepare('SELECT model, input_per_million, output_per_million FROM credit_pricing WHERE model = ?')
		.bind(model)
		.first<{ model: string; input_per_million: number; output_per_million: number }>();

	if (row) {
		return {
			model: row.model,
			inputPerMillion: row.input_per_million,
			outputPerMillion: row.output_per_million
		};
	}

	return { ...FALLBACK_PRICING, model };
}

export function calculateCreditsUsed(
	inputTokens: number,
	outputTokens: number,
	pricing: CreditPricing,
	creditValueUsd: number = CREDIT_VALUE_USD
): number {
	const inputCost = (inputTokens * pricing.inputPerMillion) / 1_000_000;
	const outputCost = (outputTokens * pricing.outputPerMillion) / 1_000_000;
	const totalUsd = inputCost + outputCost;
	const credits = totalUsd / creditValueUsd;
	// Round to 2 decimal places
	return Math.round(credits * 100) / 100;
}

export async function listCreditTransactions(
	db: D1Database,
	userId: string,
	limit: number = 50
): Promise<CreditTransaction[]> {
	const rows = await db
		.prepare(
			`SELECT id, user_id, model, input_tokens, output_tokens, credits_used, conversation_id, created_at
			FROM credit_transactions
			WHERE user_id = ?
			ORDER BY created_at DESC
			LIMIT ?`
		)
		.bind(userId, limit)
		.all<{
			id: string;
			user_id: string;
			model: string;
			input_tokens: number;
			output_tokens: number;
			credits_used: number;
			conversation_id: string | null;
			created_at: number;
		}>();

	return (rows.results ?? []).map((r) => ({
		id: r.id,
		userId: r.user_id,
		model: r.model,
		inputTokens: r.input_tokens,
		outputTokens: r.output_tokens,
		creditsUsed: r.credits_used,
		conversationId: r.conversation_id ?? undefined,
		createdAt: r.created_at
	}));
}
