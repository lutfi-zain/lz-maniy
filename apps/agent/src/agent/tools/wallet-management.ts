/// <reference types="@cloudflare/workers-types" />
import { tool } from 'ai';
import { z } from 'zod';
import { createApiClient, extractErrorMessage } from './http.js';

export function createWalletTools(reedrichUrl: string, token: string, fetcher?: Fetcher) {
	const { request } = createApiClient(reedrichUrl, token, fetcher);

	return {
		list_wallets: tool({
			description: 'Ambil daftar seluruh dompet (wallet), saldo terkini, mata uang, status locked/spendable, serta mutasi transaksi terakhir.',
			parameters: z.object({
				startDate: z.string().optional().describe('Filter tanggal mulai (YYYY-MM-DD)'),
				endDate: z.string().optional().describe('Filter tanggal akhir (YYYY-MM-DD)'),
				filter: z.enum(['realized', 'planned', 'all']).optional().describe('Filter tipe transaksi snapshot'),
				isLocked: z.union([z.boolean(), z.number()]).optional().describe('Filter status locked (true/1) atau spendable (false/0)')
			}),
			execute: async (params) => {
				const query = new URLSearchParams();
				if (params.startDate) query.set('startDate', params.startDate);
				if (params.endDate) query.set('endDate', params.endDate);
				if (params.filter) query.set('filter', params.filter);
				if (params.isLocked !== undefined) query.set('isLocked', String(params.isLocked));

				const res = await request(`/api/v1/wallets${query.toString() ? `?${query}` : ''}`);
				if (!res.ok) throw new Error(`list_wallets failed: ${res.status}`);
				return await res.json();
			}
		}),
		get_wallet: tool({
			description: 'Ambil detail lengkap satu dompet/rekening berdasarkan ID wallet.',
			parameters: z.object({
				walletId: z.string().describe('ID UUID dompet yang ingin dilihat detailnya')
			}),
			execute: async ({ walletId }) => {
				const res = await request(`/api/v1/wallets/${walletId}`);
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(`get_wallet failed: ${extractErrorMessage(err, res.status)}`);
				}
				return await res.json();
			}
		}),

		create_wallet: tool({
			description: 'Buat dompet/rekening baru di Reedrich. Selalu konfirmasi rincian ke pengguna sebelum memanggil tool ini!',
			parameters: z.object({
				name: z.string().min(1).describe('Nama dompet, misal "BCA Main", "Cash Rumah", "Jago HUZ"'),
				institution: z.string().optional().describe('Nama institusi/bank, misal "BCA", "Bank Jago", "Cash"'),
				type: z.enum(['bank', 'cash', 'e-wallet', 'credit', 'crypto', 'investment']).optional().describe('Tipe dompet'),
				balance: z.number().optional().describe('Saldo awal'),
				currency: z.string().default('IDR').describe('Kode mata uang, default "IDR"'),
				isLocked: z.union([z.boolean(), z.number()]).optional().describe('Apakah dompet ini dana terkunci/tabungan (1/true) atau kas siap pakai (0/false)')
			}),
			execute: async (params) => {
				const res = await request('/api/v1/wallets', {
					method: 'POST',
					body: JSON.stringify(params)
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(`create_wallet failed: ${extractErrorMessage(err, res.status)}`);
				}
				return await res.json();
			}
		}),

		update_wallet: tool({
			description: 'Ubah data atau status dompet yang ada (nama, saldo, institusi, atau status kunci/isLocked).',
			parameters: z.object({
				walletId: z.string().describe('ID UUID dompet yang akan diubah'),
				name: z.string().optional().describe('Nama baru dompet'),
				institution: z.string().optional().describe('Institusi baru'),
				type: z.enum(['bank', 'cash', 'e-wallet', 'credit', 'crypto', 'investment']).optional(),
				balance: z.number().optional().describe('Koreksi saldo'),
				currency: z.string().optional(),
				isLocked: z.union([z.boolean(), z.number()]).optional().describe('Status terkunci (1/true) atau siap pakai (0/false)')
			}),
			execute: async ({ walletId, ...delta }) => {
				const res = await request(`/api/v1/wallets/${walletId}`, {
					method: 'PATCH',
					body: JSON.stringify(delta)
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(`update_wallet failed: ${extractErrorMessage(err, res.status)}`);
				}
				return await res.json();
			}
		}),

		delete_wallet: tool({
			description: 'Hapus dompet yang saldonya 0 dan tidak memiliki link aktif. WAJIB minta konfirmasi eksplisit dari pengguna!',
			parameters: z.object({
				walletId: z.string().describe('ID UUID dompet yang akan dihapus')
			}),
			execute: async ({ walletId }) => {
				const res = await request(`/api/v1/wallets/${walletId}`, {
					method: 'DELETE'
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(`delete_wallet failed: ${extractErrorMessage(err, res.status)}`);
				}
				return await res.json();
			}
		})
	};
}
