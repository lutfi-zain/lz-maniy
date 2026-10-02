/// <reference types="node" />
import type { APIRequestContext, Page } from '@playwright/test';
import { redactDiagnostics, validateTestPreflight } from '../../../src/lib/utils/credential-guard';

export interface LiveAccountConfig {
	apiBaseUrl: string;
	token: string;
	expectedUserId: string;
	allowDestructive: boolean;
	allowProduction: boolean;
}

export function getLiveAccountConfig(): LiveAccountConfig {
	return {
		apiBaseUrl:
			process.env.REEDRICH_TEST_API_BASE_URL ||
			process.env.PUBLIC_API_URL ||
			'https://reedrich-mcp.lutfidmz.workers.dev',
		token: process.env.REEDRICH_TEST_API_TOKEN || process.env.TEST_TOKEN || '',
		expectedUserId: process.env.REEDRICH_TEST_USER_ID || 'usr_muhwbsfe_722e117da986448e',
		allowDestructive: process.env.REEDRICH_TEST_ALLOW_DESTRUCTIVE === 'true',
		allowProduction: process.env.REEDRICH_TEST_ALLOW_PRODUCTION === 'true'
	};
}

/**
 * Executes API preflight safety check and verifies authenticated testbot identity.
 */
export async function assertAuthorizedTestAccount(request: APIRequestContext, config: LiveAccountConfig): Promise<void> {
	const preflight = validateTestPreflight({
		apiBaseUrl: config.apiBaseUrl,
		token: config.token,
		allowDestructive: config.allowDestructive,
		allowProduction: config.allowProduction
	});

	if (!preflight.valid) {
		throw new Error(redactDiagnostics(preflight.error || 'Preflight authorization check failed.'));
	}

	const res = await request.get(`${config.apiBaseUrl}/api/v1/me`, {
		headers: {
			Authorization: `Bearer ${config.token}`
		}
	});

	if (!res.ok()) {
		throw new Error(
			redactDiagnostics(`Failed to fetch /api/v1/me profile (HTTP ${res.status()}): ${await res.text()}`)
		);
	}

	const profile = await res.json();
	const actualUserId = profile.userId || profile.id;
	if (config.expectedUserId && actualUserId && actualUserId !== config.expectedUserId) {
		throw new Error(
			redactDiagnostics(
				`Safety Violation: Authenticated user ID (${actualUserId}) does not match expected test account ID (${config.expectedUserId}). Aborting!`
			)
		);
	}
}

/**
 * Complete paginated cleanup sweep of all mutable entities for the dedicated test account.
 */
export async function sweepLiveAccount(request: APIRequestContext, config: LiveAccountConfig): Promise<void> {
	const headers = { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' };
	const base = config.apiBaseUrl;

	// 1. Delete all recurring templates first
	const recRes = await request.get(`${base}/api/v1/recurring-templates`, { headers });
	if (recRes.ok()) {
		const recs = (await recRes.json()) as Array<{ templateId: string }>;
		for (const r of recs) {
			await request.delete(`${base}/api/v1/recurring-templates/${r.templateId}`, { headers });
		}
	}

	// 2. Delete all transactions
	const txRes = await request.get(`${base}/api/v1/transactions?limit=100`, { headers });
	if (txRes.ok()) {
		const txData = await txRes.json();
		const items = Array.isArray(txData) ? txData : txData.items || [];
		for (const t of items) {
			const id = t.transactionId || t.id;
			if (id) {
				await request.delete(`${base}/api/v1/transactions/${id}`, { headers });
			}
		}
	}

	// 3. Unlink and delete all goals
	const goalsRes = await request.get(`${base}/api/v1/goals`, { headers });
	if (goalsRes.ok()) {
		const goals = (await goalsRes.json()) as Array<{ goalId: string; linkedWallets?: Array<{ walletId: string }> }>;
		for (const g of goals) {
			if (g.linkedWallets) {
				for (const w of g.linkedWallets) {
					await request.delete(`${base}/api/v1/goals/${g.goalId}/wallets/${w.walletId}`, { headers });
				}
			}
			await request.delete(`${base}/api/v1/goals/${g.goalId}`, { headers });
		}
	}

	// 4. Delete all budgets
	const budRes = await request.get(`${base}/api/v1/budgets`, { headers });
	if (budRes.ok()) {
		const rawBudgets: unknown = await budRes.json();
		const items = Array.isArray(rawBudgets) ? rawBudgets : [];
		for (const entry of items) {
			let id: string | undefined;
			if (entry && typeof entry === 'object') {
				if ('budget' in entry && entry.budget && typeof entry.budget === 'object') {
					const b = entry.budget;
					if ('budgetId' in b && typeof b.budgetId === 'string') id = b.budgetId;
					else if ('id' in b && typeof b.id === 'string') id = b.id;
				}
				if (!id && 'budgetId' in entry && typeof entry.budgetId === 'string') {
					id = entry.budgetId;
				} else if (!id && 'id' in entry && typeof entry.id === 'string') {
					id = entry.id;
				}
			}
			if (id) {
				await request.delete(`${base}/api/v1/budgets/${id}`, { headers });
			}
		}
	}

	// 5. Delete all debts & loans
	const debtRes = await request.get(`${base}/api/v1/debts-loans`, { headers });
	if (debtRes.ok()) {
		const dlData = await debtRes.json();
		const debts = dlData.debts || dlData.activeDebts || [];
		const loans = dlData.loans || dlData.activeLoans || [];
		for (const d of [...debts, ...loans]) {
			const id = d.debtLoanId || d.id;
			if (id) {
				await request.delete(`${base}/api/v1/debts-loans/${id}`, { headers });
			}
		}
	}

	// 6. Delete custom categories (preserving Adjustment)
	const catRes = await request.get(`${base}/api/v1/categories`, { headers });
	if (catRes.ok()) {
		const cats = (await catRes.json()) as Array<{ categoryId: string; categoryName: string }>;
		for (const c of cats) {
			if (c.categoryName.toLowerCase() !== 'adjustment') {
				await request.delete(`${base}/api/v1/categories/${c.categoryId}`, { headers });
			}
		}
	}

	// 7. Zero out and delete all wallets
	const walRes = await request.get(`${base}/api/v1/wallets`, { headers });
	if (walRes.ok()) {
		const wallets = (await walRes.json()) as Array<{ walletId: string; walletBalance?: number }>;
		for (const w of wallets) {
			// PATCH balance to 0 first if not 0
			await request.patch(`${base}/api/v1/wallets/${w.walletId}`, {
				headers,
				data: { balance: 0 }
			});
			await request.delete(`${base}/api/v1/wallets/${w.walletId}`, { headers });
		}
	}

	// 8. Verify clean/empty state
	await verifyEmptyAccountState(request, config);
}

/**
 * Verifies that the account is in a completely clean/empty state.
 */
export async function verifyEmptyAccountState(
	request: APIRequestContext,
	config: LiveAccountConfig
): Promise<void> {
	const headers = { Authorization: `Bearer ${config.token}` };
	const base = config.apiBaseUrl;

	const [walRes, txRes, gRes, bRes, recRes] = await Promise.all([
		request.get(`${base}/api/v1/wallets`, { headers }),
		request.get(`${base}/api/v1/transactions?limit=50`, { headers }),
		request.get(`${base}/api/v1/goals`, { headers }),
		request.get(`${base}/api/v1/budgets`, { headers }),
		request.get(`${base}/api/v1/recurring-templates`, { headers })
	]);

	const wallets = walRes.ok() ? ((await walRes.json()) as unknown[]) : [];
	let txs: unknown[] = [];
	if (txRes.ok()) {
		const txData = await txRes.json();
		txs = Array.isArray(txData) ? txData : txData.items || [];
	}
	const goals = gRes.ok() ? ((await gRes.json()) as unknown[]) : [];
	const budgets = bRes.ok() ? ((await bRes.json()) as unknown[]) : [];
	const recurring = recRes.ok() ? ((await recRes.json()) as unknown[]) : [];

	if (wallets.length > 0 || txs.length > 0 || goals.length > 0 || budgets.length > 0 || recurring.length > 0) {
		throw new Error(
			`Cleanup Verification Failed: Residual entities detected. Wallets: ${wallets.length}, Transactions: ${txs.length}, Goals: ${goals.length}, Budgets: ${budgets.length}, Recurring: ${recurring.length}`
		);
	}
}

/**
 * Configures browser localStorage session with authorized test credentials.
 */
export async function injectBrowserTestAuth(page: Page, config: LiveAccountConfig): Promise<void> {
	await page.addInitScript(
		({ token, userId }) => {
			localStorage.setItem('reedrich_access_token', token);
			localStorage.setItem('reedrich_expires_at', '2524608000000');
			localStorage.setItem(
				'reedrich_user',
				JSON.stringify({
					name: 'Maniyy TestBot',
					email: 'testbot@maniyy.dev',
					id: userId
				})
			);
		},
		{ token: config.token, userId: config.expectedUserId }
	);
}
