/// <reference types="@cloudflare/workers-types" />
import { tool } from 'ai';
import { z } from 'zod';
import { createApiClient, extractErrorMessage } from './http.js';

export function createBudgetTools(reedrichUrl: string, token: string, fetcher?: Fetcher) {
	const { request } = createApiClient(reedrichUrl, token, fetcher);

	return {
		list_budgets: tool({
			description: 'Ambil daftar seluruh pagu anggaran (budget) aktif, batas alokasi, realisasi pengeluaran, sisa kuota, dan persentase penggunaan.',
			parameters: z.object({}),
			execute: async () => {
				const res = await request('/api/v1/budgets');
				if (!res.ok) throw new Error(`list_budgets failed: ${res.status}`);
				return await res.json();
			}
		}),

		get_budget: tool({
			description: 'Ambil detail lengkap satu pagu anggaran (budget) berdasarkan ID budget.',
			parameters: z.object({
				budgetId: z.string().describe('ID UUID anggaran yang ingin dilihat detailnya')
			}),
			execute: async ({ budgetId }) => {
				const res = await request(`/api/v1/budgets/${budgetId}`);
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(`get_budget failed: ${extractErrorMessage(err, res.status)}`);
				}
				return await res.json();
			}
		}),

		create_budget: tool({
			description: 'Buat pagu anggaran (budget) baru untuk kategori atau pos pengeluaran tertentu.',
			parameters: z.object({
				name: z.string().min(1).describe('Nama anggaran, misal "Makan & Minum Sep 2026", "Jenguk Mertua"'),
				amount: z.number().positive().describe('Nominal batas anggaran (dalam Rupiah)'),
				periodStart: z.string().optional().describe('Tanggal awal periode (YYYY-MM-DD)'),
				periodEnd: z.string().optional().describe('Tanggal akhir periode (YYYY-MM-DD)'),
				categoryId: z.string().optional().describe('ID UUID kategori transaksi yang diikat')
			}),
			execute: async (params) => {
				const res = await request('/api/v1/budgets', {
					method: 'POST',
					body: JSON.stringify(params)
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(`create_budget failed: ${extractErrorMessage(err, res.status)}`);
				}
				return await res.json();
			}
		}),

		update_budget: tool({
			description: 'Ubah pagu anggaran yang sudah ada (nama, batas nominal, atau periode).',
			parameters: z.object({
				budgetId: z.string().describe('ID UUID anggaran yang akan diubah'),
				name: z.string().optional().describe('Nama baru anggaran'),
				amount: z.number().positive().optional().describe('Batas nominal baru'),
				periodStart: z.string().optional().describe('Tanggal awal periode (YYYY-MM-DD)'),
				periodEnd: z.string().optional().describe('Tanggal akhir periode (YYYY-MM-DD)'),
				categoryId: z.string().optional().describe('ID UUID kategori')
			}),
			execute: async ({ budgetId, ...delta }) => {
				const res = await request(`/api/v1/budgets/${budgetId}`, {
					method: 'PATCH',
					body: JSON.stringify(delta)
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(`update_budget failed: ${extractErrorMessage(err, res.status)}`);
				}
				return await res.json();
			}
		}),

		delete_budget: tool({
			description: 'Hapus pagu anggaran. Transaksi yang terkait akan tetap tersimpan.',
			parameters: z.object({
				budgetId: z.string().describe('ID UUID anggaran yang akan dihapus')
			}),
			execute: async ({ budgetId }) => {
				const res = await request(`/api/v1/budgets/${budgetId}`, {
					method: 'DELETE'
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(`delete_budget failed: ${extractErrorMessage(err, res.status)}`);
				}
				return await res.json();
			}
		})
	};
}
