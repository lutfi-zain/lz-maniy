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
			description: 'Ambil ringkasan akun: total net worth, daftar wallet beserta saldo, dan ringkasan anggaran bulanan.',
			parameters: z.object({}),
			execute: async () => {
				const res = await doFetch(`${reedrichUrl}/api/v1/account-detail`);
				if (!res.ok) throw new Error(`get_snapshot failed: ${res.status}`);
				const data = (await res.json()) as AccountDetail;
				return {
					netWorth: {
						total: data.netWorth.consolidated.total,
						currency: data.netWorth.consolidated.currency
					},
					spendableWallets: data.wallets.spendable.items.map((w) => ({
						walletName: w.walletName,
						institution: w.institution,
						balance: w.balance,
						currency: w.currency
					})),
					totalSpendable: data.wallets.spendable.total,
					lockedWallets: data.wallets.locked.items.map((w) => ({
						walletName: w.walletName,
						institution: w.institution,
						balance: w.balance,
						currency: w.currency
					})),
					totalLocked: data.wallets.locked.total,
					monthlySummary: {
						totalIncome: data.monthlyCashFlow.totalIncome,
						totalExpense: data.monthlyCashFlow.totalExpense,
						netSavings: data.monthlyCashFlow.netSavings
					}
				};
			}
		}),

		list_transactions: tool({
			description: 'Ambil daftar transaksi dengan filter opsional (wallet, kategori, rentang tanggal, limit).',
			parameters: z.object({
				walletId: z.string().optional().describe('Filter by wallet ID'),
				categoryId: z.string().optional().describe('Filter by category ID'),
				budgetId: z.string().optional().describe('Filter by budget ID'),
				startDate: z.string().optional().describe('Filter tanggal mulai format YYYY-MM-DD'),
				endDate: z.string().optional().describe('Filter tanggal akhir format YYYY-MM-DD'),
				limit: z.number().int().min(1).max(50).default(20).describe('Max results'),
				offset: z.number().int().min(0).default(0).describe('Pagination offset')
			}),
			execute: async (params) => {
				const qs = new URLSearchParams();
				if (params.walletId) qs.set('walletId', params.walletId);
				if (params.categoryId) qs.set('categoryId', params.categoryId);
				if (params.budgetId) qs.set('budgetId', params.budgetId);
				if (params.startDate) qs.set('startDate', params.startDate);
				if (params.endDate) qs.set('endDate', params.endDate);
				qs.set('limit', String(params.limit));
				qs.set('offset', String(params.offset));
				const res = await doFetch(`${reedrichUrl}/api/v1/transactions?${qs}`);
				if (!res.ok) throw new Error(`list_transactions failed: ${res.status}`);
				const data = (await res.json()) as TransactionRecord[];
				return data.map((t) => ({
					date: t.transactionDate,
					amount: t.transactionAmount,
					type: t.transactionType,
					isPlanned: t.transactionIsPlanned === 1,
					description: t.transactionDescription
				}));
			}
		}),

		get_categories: tool({
			description: 'Ambil semua kategori transaksi milik pengguna.',
			parameters: z.object({}),
			execute: async () => {
				const res = await doFetch(`${reedrichUrl}/api/v1/categories`);
				if (!res.ok) throw new Error(`get_categories failed: ${res.status}`);
				const data = (await res.json()) as CategoryRecord[];
				return data.map((c) => ({
					id: c.categoryId,
					name: c.categoryName,
					type: c.categoryType
				}));
			}
		}),

		get_user_profile: tool({
			description: 'Ambil profil pengguna yang sedang login.',
			parameters: z.object({}),
			execute: async () => {
				const res = await doFetch(`${reedrichUrl}/api/v1/me`);
				if (!res.ok) throw new Error(`get_user_profile failed: ${res.status}`);
				return (await res.json()) as UserProfileDTO;
			}
		})
	};
}
