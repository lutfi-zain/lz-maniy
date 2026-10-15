/// <reference types="@cloudflare/workers-types" />
import { tool } from 'ai';
import { z } from 'zod';
import type { AccountDetail, TransactionRecord, CategoryRecord, UserProfileDTO } from '@maniy/shared';
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
			description:
				'Ambil proyeksi papan horizon masa depan multi-bulan (roll-forward cashflow deterministik, akumulasi saldo dompet, dan capaian target tabungan). Gunakan tool ini untuk pertanyaan tren 2-24 bulan ke depan, simulasi runway tabungan, atau perkiraan waktu capaian milestone target. JANGAN gunakan untuk mencari transaksi tunggal atau mutasi spesifik.',
			parameters: z.object({
				months: z
					.number()
					.int()
					.min(1)
					.max(24)
					.default(6)
					.describe('Jumlah bulan ke depan untuk proyeksi (1 s/d 24 bulan, default 6)'),
				filter: z
					.enum(['realized', 'planned', 'all'])
					.default('all')
					.describe(
						'Filter mutasi: all (default, komitmen riil + rencana), planned (hanya rencana), realized (hanya riil)'
					),
				baseCurrency: z
					.string()
					.optional()
					.default('IDR')
					.describe('Mata uang dasar untuk konsolidasi nilai (default: IDR)')
			}),
			execute: async (params) => {
				const qs = new URLSearchParams({
					months: String(params.months),
					filter: params.filter,
					baseCurrency: params.baseCurrency
				});
				const res = await request(`/api/v1/analytics/horizon?${qs}`);
				if (!res.ok) {
					const errText = await res.text().catch(() => '');
					console.warn(`[horizon_projection] ReedRich returned ${res.status}: ${errText}`);
					return { error: `horizon_projection failed: ${res.status}`, periods: [] };
				}
				const raw = (await res.json()) as {
					baseCurrency?: string;
					startingNetWorth?: { total?: number; spendable?: number; locked?: number };
					periods?: Array<{
						periodKey?: string;
						startDate?: string;
						endDate?: string;
						cashflow?: {
							income?: number;
							expense?: number;
							net?: number;
							netSpendable?: number;
							netLocked?: number;
						};
						netWorth?: {
							total?: number;
							spendable?: number;
							locked?: number;
						};
						goals?: Array<{
							goalName?: string;
							targetAmount?: number;
							currentAmount?: number;
							milestoneStatus?: string;
							isCompleted?: boolean;
						}>;
					}>;
				};

				return {
					baseCurrency: raw.baseCurrency || 'IDR',
					startingNetWorth: raw.startingNetWorth,
					periods: (raw.periods || []).map((p) => {
						const milestones = (p.goals || [])
							.filter((g) => g.milestoneStatus === 'reached' || g.isCompleted)
							.map((g) => ({ name: g.goalName, target: Math.round(g.targetAmount || 0) }));

						return {
							month: p.periodKey,
							income: Math.round(p.cashflow?.income ?? 0),
							expense: Math.round(p.cashflow?.expense ?? 0),
							netSpendable: Math.round(p.cashflow?.netSpendable ?? 0),
							spendableNetWorth: Math.round(p.netWorth?.spendable ?? 0),
							totalNetWorth: Math.round(p.netWorth?.total ?? 0),
							...(milestones.length > 0 ? { milestones } : {})
						};
					})
				};
			}
		}),

		list_transactions: tool({
			description: 'Ambil daftar transaksi dengan filter tanggal, kata kunci pencarian, status, jenis, wallet, atau kategori.',
			parameters: z.object({
				q: z.string().optional().describe('Kata kunci pencarian deskripsi atau catatan transaksi'),
				search: z.string().optional().describe('Alias untuk q (pencarian teks transaksi)'),
				type: z.enum(['expense', 'income', 'transfer']).optional().describe('Filter tipe transaksi'),
				status: z.enum(['realized', 'planned', 'all']).optional().describe('Filter status transaksi'),
				isPlanned: z.union([z.boolean(), z.number()]).optional().describe('Filter status rencana: true/1 untuk rencana, false/0 untuk riil'),
				startDate: z.string().optional().describe('Tanggal mulai format YYYY-MM-DD'),
				endDate: z.string().optional().describe('Tanggal akhir format YYYY-MM-DD'),
				walletId: z.string().optional().describe('Filter ID wallet asal/sumber'),
				targetWalletId: z.string().optional().describe('Filter ID wallet tujuan (untuk transfer)'),
				categoryId: z.string().optional().describe('Filter ID kategori transaksi'),
				budgetId: z.string().optional().describe('Filter ID budget yang terikat'),
				orderBy: z.enum(['date', 'amount', 'createdAt', 'description', 'date_desc', 'date_asc', 'amount_desc', 'amount_asc']).optional().describe('Urutan pengurutan data transaksi (date, amount, createdAt, description)'),
				direction: z.enum(['asc', 'desc']).optional().describe('Arah pengurutan: asc atau desc (default desc)'),
				limit: z.number().int().min(1).max(100).default(50)
			}),
			execute: async (params) => {
				const qs = new URLSearchParams();
				const queryText = params.q || params.search;
				if (queryText) qs.set('q', queryText);
				if (params.type) qs.set('type', params.type);
				if (params.status) qs.set('status', params.status);
				if (params.isPlanned !== undefined) qs.set('isPlanned', String(params.isPlanned));

				// Normalize dates if passed as YYYY-MM
				if (params.startDate) {
					let s = params.startDate.trim();
					if (/^\d{4}-\d{2}$/.test(s)) s = `${s}-01`;
					qs.set('startDate', s);
				}
				if (params.endDate) {
					let e = params.endDate.trim();
					if (/^\d{4}-\d{2}$/.test(e)) {
						const [y, m] = e.split('-').map(Number);
						const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
						e = `${e}-${String(lastDay).padStart(2, '0')}`;
					}
					qs.set('endDate', e);
				}

				if (params.walletId) qs.set('walletId', params.walletId);
				if (params.targetWalletId) qs.set('targetWalletId', params.targetWalletId);
				if (params.categoryId) qs.set('categoryId', params.categoryId);
				if (params.budgetId) qs.set('budgetId', params.budgetId);

				// Map compound orderBy (date_desc, amount_desc, etc.) to valid backend orderBy and direction
				let orderBy = params.orderBy;
				let direction = params.direction;
				if (orderBy) {
					if (orderBy === 'date_desc') {
						orderBy = 'date';
						direction = 'desc';
					} else if (orderBy === 'date_asc') {
						orderBy = 'date';
						direction = 'asc';
					} else if (orderBy === 'amount_desc') {
						orderBy = 'amount';
						direction = 'desc';
					} else if (orderBy === 'amount_asc') {
						orderBy = 'amount';
						direction = 'asc';
					}
					qs.set('orderBy', orderBy);
				}
				if (direction) {
					qs.set('direction', direction);
				}
				qs.set('limit', String(params.limit));

				const res = await request(`/api/v1/transactions?${qs}`);
				if (!res.ok) {
					const errText = await res.text().catch(() => '');
					console.warn(`[list_transactions] ReedRich returned ${res.status}: ${errText} (query: ${qs.toString()})`);
					return [];
				}
				const raw = await res.json();
				const items: TransactionRecord[] = Array.isArray(raw)
					? (raw as TransactionRecord[])
					: raw && typeof raw === 'object' && 'items' in raw && Array.isArray(raw.items)
						? (raw.items as TransactionRecord[])
						: [];

				return items.map((t) => ({
					id: t.transactionId,
					date: t.transactionDate,
					amount: t.transactionAmount,
					adminFee: t.transactionAdminFee ?? undefined,
					walletId: t.transactionWalletId,
					targetWalletId: t.transactionTargetWalletId ?? undefined,
					categoryId: t.transactionCategoryId ?? undefined,
					budgetId: t.transactionBudgetId ?? undefined,
					type: t.transactionType,
					isPlanned: t.transactionIsPlanned === 1,
					desc: (t.transactionDescription ?? '').slice(0, 100)
				}));
			}
		}),

		get_transaction: tool({
			description: 'Ambil detail lengkap satu transaksi berdasarkan ID transaksi.',
			parameters: z.object({
				transactionId: z.string().describe('ID UUID transaksi yang ingin dilihat detailnya')
			}),
			execute: async ({ transactionId }) => {
				const res = await request(`/api/v1/transactions/${transactionId}`);
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(`get_transaction failed: ${extractErrorMessage(err, res.status)}`);
				}
				return (await res.json()) as TransactionRecord;
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
