/// <reference types="@cloudflare/workers-types" />
import { tool } from 'ai';
import { z } from 'zod';
import type { AccountDetail, TransactionRecord, CategoryRecord, UserProfileDTO } from '@maniyy/shared';
import { createApiClient, extractErrorMessage } from './http.js';

export function createFinancialTools(reedrichUrl: string, token: string, fetcher?: Fetcher) {
	const { request } = createApiClient(reedrichUrl, token, fetcher);

	return {
		get_snapshot: tool({
			description: 'Ambil ringkasan portofolio: total net worth (beserta byCurrency), rincian saldo wallet, dan top alokasi kategori pengeluaran.',
			parameters: z.object({}),
			execute: async () => {
				const res = await request('/api/v1/account-detail');
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

		financial_summary: tool({
			description: 'Ambil laporan kesehatan finansial agregat: net worth per mata uang & institusi, safeToSpend (dana aman dibelanjakan), dailySafeToSpend harian, dan potongan kewajiban.',
			parameters: z.object({
				startDate: z.string().optional().describe('Tanggal awal periode (YYYY-MM-DD)'),
				endDate: z.string().optional().describe('Tanggal akhir periode (YYYY-MM-DD)'),
				baseCurrency: z.string().optional().default('IDR').describe('Mata uang dasar, default IDR')
			}),
			execute: async (params) => {
				const qs = new URLSearchParams();
				if (params.startDate) qs.set('startDate', params.startDate);
				if (params.endDate) qs.set('endDate', params.endDate);
				if (params.baseCurrency) qs.set('baseCurrency', params.baseCurrency);

				const res = await request(`/api/v1/summary${qs.toString() ? `?${qs}` : ''}`);
				if (!res.ok) throw new Error(`financial_summary failed: ${res.status}`);
				return await res.json();
			}
		}),

		horizon_projection: tool({
			description: 'Ambil proyeksi papan horizon multi-periode masa depan (roll-forward cashflow, akumulasi saldo dompet, dan capaian target tabungan).',
			parameters: z.object({
				months: z.number().int().min(1).max(24).default(6).describe('Jumlah bulan ke depan (1 s/d 24)'),
				filter: z.enum(['realized', 'planned', 'all']).default('all').describe('Filter mutasi'),
				baseCurrency: z.string().optional().default('IDR')
			}),
			execute: async (params) => {
				const qs = new URLSearchParams({
					months: String(params.months),
					filter: params.filter,
					baseCurrency: params.baseCurrency
				});
				const res = await request(`/api/v1/analytics/horizon?${qs}`);
				if (!res.ok) throw new Error(`horizon_projection failed: ${res.status}`);
				return await res.json();
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

				const res = await request(`/api/v1/transactions?${qs}`);
				if (!res.ok) throw new Error(`list_transactions failed: ${res.status}`);
				const raw = await res.json();
				const items: TransactionRecord[] = Array.isArray(raw)
					? (raw as TransactionRecord[])
					: raw && typeof raw === 'object' && 'items' in raw && Array.isArray(raw.items)
						? (raw.items as TransactionRecord[])
						: [];

				return items.map((t) => ({
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
			description: 'Ambil semua kategori transaksi (pemasukan dan pengeluaran).',
			parameters: z.object({}),
			execute: async () => {
				const res = await request('/api/v1/categories');
				if (!res.ok) throw new Error(`get_categories failed: ${res.status}`);
				const data = (await res.json()) as CategoryRecord[];
				return data.map((c) => ({ id: c.categoryId, name: c.categoryName, type: c.categoryType, icon: c.categoryIcon }));
			}
		}),

		create_category: tool({
			description: 'Buat kategori transaksi baru.',
			parameters: z.object({
				name: z.string().min(1).describe('Nama kategori, misal "Perawatan Rumah", "Leisure"'),
				type: z.enum(['expense', 'income']).default('expense'),
				icon: z.string().optional().describe('Emoji icon kategori, misal "🏠"')
			}),
			execute: async (params) => {
				const res = await request('/api/v1/categories', {
					method: 'POST',
					body: JSON.stringify(params)
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(`create_category failed: ${extractErrorMessage(err, res.status)}`);
				}
				return await res.json();
			}
		}),

		update_category: tool({
			description: 'Ubah nama atau icon kategori yang ada.',
			parameters: z.object({
				categoryId: z.string().describe('ID UUID kategori'),
				name: z.string().optional(),
				icon: z.string().optional()
			}),
			execute: async ({ categoryId, ...delta }) => {
				const res = await request(`/api/v1/categories/${categoryId}`, {
					method: 'PATCH',
					body: JSON.stringify(delta)
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(`update_category failed: ${extractErrorMessage(err, res.status)}`);
				}
				return await res.json();
			}
		}),

		delete_category: tool({
			description: 'Hapus kategori custom (kategori sistem Adjustment dilindungi).',
			parameters: z.object({
				categoryId: z.string().describe('ID UUID kategori yang akan dihapus')
			}),
			execute: async ({ categoryId }) => {
				const res = await request(`/api/v1/categories/${categoryId}`, {
					method: 'DELETE'
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(`delete_category failed: ${extractErrorMessage(err, res.status)}`);
				}
				return await res.json();
			}
		}),

		get_user_profile: tool({
			description: 'Ambil profil pengguna.',
			parameters: z.object({}),
			execute: async () => {
				const res = await request('/api/v1/me');
				if (!res.ok) throw new Error(`get_user_profile failed: ${res.status}`);
				return (await res.json()) as UserProfileDTO;
			}
		}),

		update_profile: tool({
			description: 'Ubah data profil pengguna (nama depan, nama belakang, nomor WhatsApp).',
			parameters: z.object({
				firstName: z.string().optional(),
				lastName: z.string().optional(),
				whatsappNumber: z.string().optional()
			}),
			execute: async (delta) => {
				const res = await request('/api/v1/me', {
					method: 'PATCH',
					body: JSON.stringify(delta)
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(`update_profile failed: ${extractErrorMessage(err, res.status)}`);
				}
				return await res.json();
			}
		})
	};
}
