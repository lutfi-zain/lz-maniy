/// <reference types="@cloudflare/workers-types" />
import { tool } from 'ai';
import { z } from 'zod';
import { createApiClient, extractErrorMessage } from './http.js';

export function createRecurringTools(reedrichUrl: string, token: string, fetcher?: Fetcher) {
	const { request } = createApiClient(reedrichUrl, token, fetcher);

	return {
		list_recurring: tool({
			description: 'Ambil daftar seluruh template transaksi berulang (recurring templates) seperti gaji, tagihan bulanan, cicilan, dan jadwal eksekusi berikutnya.',
			parameters: z.object({}),
			execute: async () => {
				const res = await request('/api/v1/recurring-templates');
				if (!res.ok) throw new Error(`list_recurring failed: ${res.status}`);
				return await res.json();
			}
		}),

		create_recurring: tool({
			description: 'Buat jadwal transaksi rutin otomatis baru (misal tagihan bulanan, SPP, cicilan).',
			parameters: z.object({
				name: z.string().min(1).describe('Nama transaksi rutin, misal "Cicilan Nmax", "Wifi Indihome"'),
				walletId: z.string().describe('ID UUID dompet sumber dana'),
				targetWalletId: z.string().optional().describe('ID UUID dompet tujuan jika bertipe transfer'),
				categoryId: z.string().optional().describe('ID UUID kategori transaksi'),
				amount: z.number().positive().describe('Nominal transaksi rutin'),
				adminFee: z.number().default(0).describe('Biaya admin transaksi jika ada'),
				type: z.enum(['expense', 'income', 'transfer']).default('expense').describe('Tipe transaksi rutin'),
				frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).default('monthly'),
				interval: z.number().default(1),
				startDate: z.string().describe('Tanggal mulai berlaku (YYYY-MM-DD)'),
				nextRunDate: z.string().optional().describe('Tanggal eksekusi berikutnya (YYYY-MM-DD)'),
				endDate: z.string().optional().describe('Tanggal berakhir jika ada tempo (YYYY-MM-DD)'),
				isActive: z.boolean().default(true),
				notes: z.string().optional()
			}),
			execute: async (params) => {
				const res = await request('/api/v1/recurring-templates', {
					method: 'POST',
					body: JSON.stringify(params)
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(`create_recurring failed: ${extractErrorMessage(err, res.status)}`);
				}
				return await res.json();
			}
		}),

		update_recurring: tool({
			description: 'Ubah template transaksi berulang yang sudah ada.',
			parameters: z.object({
				templateId: z.string().describe('ID UUID template recurring'),
				name: z.string().optional(),
				amount: z.number().positive().optional(),
				frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
				nextRunDate: z.string().optional().describe('Tanggal eksekusi berikutnya (YYYY-MM-DD)'),
				walletId: z.string().optional(),
				categoryId: z.string().optional(),
				type: z.enum(['expense', 'income', 'transfer']).optional(),
				description: z.string().optional(),
				isActive: z.boolean().optional(),
				adminFee: z.number().optional()
			}),
			execute: async ({ templateId, ...delta }) => {
				const res = await request(`/api/v1/recurring-templates/${templateId}`, {
					method: 'PATCH',
					body: JSON.stringify(delta)
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(`update_recurring failed: ${extractErrorMessage(err, res.status)}`);
				}
				return await res.json();
			}
		}),

		get_recurring: tool({
			description: 'Ambil detail lengkap satu template transaksi berulang (recurring) berdasarkan ID template.',
			parameters: z.object({
				templateId: z.string().describe('ID UUID template recurring yang ingin dilihat detailnya')
			}),
			execute: async ({ templateId }) => {
				const res = await request(`/api/v1/recurring-templates/${templateId}`);
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(`get_recurring failed: ${extractErrorMessage(err, res.status)}`);
				}
				return await res.json();
			}
		}),

		delete_recurring: tool({
			description: 'Hapus template transaksi berulang.',
			parameters: z.object({
				templateId: z.string().describe('ID UUID template recurring yang akan dihapus')
			}),
			execute: async ({ templateId }) => {
				const res = await request(`/api/v1/recurring-templates/${templateId}`, {
					method: 'DELETE'
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(`delete_recurring failed: ${extractErrorMessage(err, res.status)}`);
				}
				return await res.json();
			}
		}),

		apply_recurring: tool({
			description: 'Realisasikan transaksi rencana dari template recurring ke transaksi riil dan majukan jadwal berikutnya.',
			parameters: z.object({
				templateId: z.string().describe('ID UUID template recurring yang akan direalisasikan'),
				transactionId: z.string().optional().describe('ID transaksi rencana spesifik yang ingin direalisasikan (opsional)'),
				executionDate: z.string().optional().describe('Tanggal eksekusi realisasi dalam format ISO-8601 (opsional)'),
				actualAmount: z.number().positive().optional().describe('Nominal aktual jika berbeda dengan template (opsional)')
			}),
			execute: async ({ templateId, transactionId, executionDate, actualAmount }) => {
				const body: Record<string, unknown> = {};
				if (transactionId) body.transactionId = transactionId;
				if (executionDate) body.executionDate = executionDate;
				if (actualAmount) body.actualAmount = actualAmount;

				const res = await request(`/api/v1/recurring-templates/${templateId}/apply`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(`apply_recurring failed: ${extractErrorMessage(err, res.status)}`);
				}
				return await res.json();
			}
		})
	};
}
