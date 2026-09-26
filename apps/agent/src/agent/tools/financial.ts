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
			description: 'Ambil ringkasan portofolio: total net worth dan ringkasan kas saat ini.',
			parameters: z.object({}),
			execute: async () => {
				const res = await doFetch(`${reedrichUrl}/api/v1/account-detail`);
				if (!res.ok) throw new Error(`get_snapshot failed: ${res.status}`);
				const data = (await res.json()) as AccountDetail;
				return {
					totalNetWorth: data.netWorth.consolidated.total,
					totalSpendable: data.wallets.spendable.total,
					totalLocked: data.wallets.locked.total
				};
			}
		}),

		list_transactions: tool({
			description: 'Ambil transaksi terencana (planned) atau riwayat mutasi dalam rentang tanggal tertentu.',
			parameters: z.object({
				startDate: z.string().optional().describe('Tanggal mulai (YYYY-MM-DD)'),
				endDate: z.string().optional().describe('Tanggal akhir (YYYY-MM-DD)'),
				limit: z.number().int().min(1).max(50).default(30)
			}),
			execute: async (params) => {
				const qs = new URLSearchParams();
				if (params.startDate) qs.set('startDate', params.startDate);
				if (params.endDate) qs.set('endDate', params.endDate);
				qs.set('limit', String(params.limit));
				const res = await doFetch(`${reedrichUrl}/api/v1/transactions?${qs}`);
				if (!res.ok) throw new Error(`list_transactions failed: ${res.status}`);
				const raw = (await res.json()) as TransactionRecord[];
				const items = Array.isArray(raw) ? raw : (raw as unknown as { items: TransactionRecord[] }).items ?? [];
				// Filter to only needed fields and exclude transfers
				return items
					.filter((t) => t.transactionType !== 'transfer')
					.slice(0, 30)
					.map((t) => ({
						date: t.transactionDate ? t.transactionDate.slice(0, 10) : '',
						amount: t.transactionAmount,
						type: t.transactionType,
						isPlanned: t.transactionIsPlanned === 1,
						desc: (t.transactionDescription ?? '').slice(0, 35)
					}));
			}
		}),

		get_categories: tool({
			description: 'Ambil kategori transaksi.',
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
