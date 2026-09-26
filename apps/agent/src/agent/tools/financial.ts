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
			description: 'Ambil data account lengkap: net worth, wallet, budget, goals, obligasi, dan cash flow bulanan.',
			parameters: z.object({}),
			execute: async () => {
				const res = await doFetch(`${reedrichUrl}/api/v1/account-detail`);
				if (!res.ok) throw new Error(`get_snapshot failed: ${res.status}`);
				return (await res.json()) as AccountDetail;
			}
		}),

		list_transactions: tool({
			description: 'Ambil daftar transaksi dengan filter opsional.',
			parameters: z.object({
				walletId: z.string().optional().describe('Filter by wallet ID'),
				categoryId: z.string().optional().describe('Filter by category ID'),
				budgetId: z.string().optional().describe('Filter by budget ID'),
				limit: z.number().int().min(1).max(100).default(50).describe('Max results'),
				offset: z.number().int().min(0).default(0).describe('Pagination offset')
			}),
			execute: async (params) => {
				const qs = new URLSearchParams();
				if (params.walletId) qs.set('walletId', params.walletId);
				if (params.categoryId) qs.set('categoryId', params.categoryId);
				if (params.budgetId) qs.set('budgetId', params.budgetId);
				qs.set('limit', String(params.limit));
				qs.set('offset', String(params.offset));
				const res = await doFetch(`${reedrichUrl}/api/v1/transactions?${qs}`);
				if (!res.ok) throw new Error(`list_transactions failed: ${res.status}`);
				return (await res.json()) as TransactionRecord[];
			}
		}),

		get_categories: tool({
			description: 'Ambil semua kategori transaksi milik pengguna.',
			parameters: z.object({}),
			execute: async () => {
				const res = await doFetch(`${reedrichUrl}/api/v1/categories`);
				if (!res.ok) throw new Error(`get_categories failed: ${res.status}`);
				return (await res.json()) as CategoryRecord[];
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
