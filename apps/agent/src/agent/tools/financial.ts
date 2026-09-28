import { tool } from 'ai';
import { z } from 'zod';
import type { AccountDetail, TransactionRecord, CategoryRecord, UserProfileDTO } from '@maniyy/shared';

export function createFinancialTools(reedrichUrl: string, token: string, fetcher?: Fetcher) {
	const headers = {
		Authorization: `Bearer ${token}`,
		'X-Api-Key': token,
		'Content-Type': 'application/json'
	};

	const doFetch = (url: string, init?: RequestInit) =>
		fetcher
			? fetcher.fetch(new Request(url, { ...init, headers: { ...headers, ...init?.headers } }))
			: fetch(url, { ...init, headers: { ...headers, ...init?.headers } });

	return {
		get_snapshot: tool({
			description: 'Ambil ringkasan portofolio: total net worth (beserta byCurrency), rincian saldo wallet, dan top alokasi kategori pengeluaran.',
			parameters: z.object({}),
			execute: async () => {
				const res = await doFetch(`${reedrichUrl}/api/v1/account-detail`);
				if (!res.ok) throw new Error(`get_snapshot failed: ${res.status}`);
				const data = (await res.json()) as AccountDetail;
				return {
					totalNetWorth: data.netWorth.consolidated.total,
					currency: data.netWorth.consolidated.currency,
					byCurrency: data.netWorth.byCurrency,
					totalSpendable: data.wallets.spendable.total,
					totalLocked: data.wallets.locked.total,
					wallets: [
						...data.wallets.spendable.items.map((w) => ({
							id: w.walletId,
							name: w.walletName,
							institution: w.institution,
							balance: w.balance,
							currency: w.currency,
							isLocked: false
						})),
						...data.wallets.locked.items.map((w) => ({
							id: w.walletId,
							name: w.walletName,
							institution: w.institution,
							balance: w.balance,
							currency: w.currency,
							isLocked: true
						}))
					],
					topExpenseCategories: (data.monthlyCashFlow.categoryBreakdown || []).slice(0, 6).map((c) => ({
						category: c.categoryName,
						amount: c.amount,
						percentage: c.percentage
					}))
				};
			}
		}),

		list_transactions: tool({
			description: 'Ambil daftar transaksi dengan filter tanggal spesifik (misal rentang bulan tertentu), wallet, atau kategori.',
			parameters: z.object({
				startDate: z.string().optional().describe('Tanggal mulai format YYYY-MM-DD'),
				endDate: z.string().optional().describe('Tanggal akhir format YYYY-MM-DD'),
				walletId: z.string().optional().describe('Filter ID wallet'),
				categoryId: z.string().optional().describe('Filter ID kategori'),
				limit: z.number().int().min(1).max(100).default(50)
			}),
			execute: async (params) => {
				const qs = new URLSearchParams();
				if (params.startDate) qs.set('startDate', params.startDate);
				if (params.endDate) qs.set('endDate', params.endDate);
				if (params.walletId) qs.set('walletId', params.walletId);
				if (params.categoryId) qs.set('categoryId', params.categoryId);
				qs.set('limit', String(params.limit));
				const res = await doFetch(`${reedrichUrl}/api/v1/transactions?${qs}`);
				if (!res.ok) throw new Error(`list_transactions failed: ${res.status}`);
				const raw = (await res.json()) as TransactionRecord[];
				const items = Array.isArray(raw) ? raw : (raw as unknown as { items: TransactionRecord[] }).items ?? [];
				return items
					.map((t) => ({
						date: t.transactionDate ? t.transactionDate.slice(0, 10) : '',
						amount: t.transactionAmount,
						walletId: t.transactionWalletId,
						targetWalletId: t.transactionTargetWalletId,
						type: t.transactionType,
						isPlanned: t.transactionIsPlanned === 1,
						desc: (t.transactionDescription ?? '').slice(0, 50)
					}));
			}
		}),

		get_categories: tool({
			description: 'Ambil semua kategori transaksi.',
			parameters: z.object({}),
			execute: async () => {
				const res = await doFetch(`${reedrichUrl}/api/v1/categories`);
				if (!res.ok) throw new Error(`get_categories failed: ${res.status}`);
				const data = (await res.json()) as CategoryRecord[];
				return data.map((c) => ({ id: c.categoryId, name: c.categoryName }));
			}
		}),

		get_user_profile: tool({
			description: 'Ambil profil pengguna.',
			parameters: z.object({}),
			execute: async () => {
				const res = await doFetch(`${reedrichUrl}/api/v1/me`);
				if (!res.ok) throw new Error(`get_user_profile failed: ${res.status}`);
				return (await res.json()) as UserProfileDTO;
			}
		})
	};
}
