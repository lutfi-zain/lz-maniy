/// <reference types="@cloudflare/workers-types" />
import { tool } from 'ai';
import { z } from 'zod';
import type { TransactionRecord } from '@maniy/shared';
import { createApiClient, extractErrorMessage } from './http.js';

export function createMutationTools(reedrichUrl: string, token: string, fetcher?: Fetcher) {
	const { request } = createApiClient(reedrichUrl, token, fetcher);

	return {
		create_transaction: tool({
			description: 'Catat transaksi baru (expense atau income). Selalu konfirmasi detail sebelum memanggil ini.',
			parameters: z.object({
				walletId: z.string().describe('ID wallet tempat transaksi'),
				categoryId: z.string().describe('ID kategori'),
				amount: z.number().positive().describe('Nominal transaksi'),
				type: z.enum(['expense', 'income']).default('expense'),
				description: z.string().optional().describe('Keterangan transaksi'),
				adminFee: z.number().default(0).describe('Biaya admin jika ada'),
				budgetId: z.string().nullable().optional().describe('ID UUID budget terkait (opsional)'),
				isPlanned: z.boolean().default(false).describe('True jika transaksi rencana/masa depan'),
				date: z.string().optional().describe('Tanggal & waktu transaksi. Format ISO-8601 lengkap (YYYY-MM-DDTHH:mm:ss+07:00) jika ada jam/menit, atau YYYY-MM-DD. Default waktu adalah WIB (+07:00).'),
				transactionDate: z.string().optional().describe('Alias untuk date (format ISO-8601)')
			}),
			execute: async (params) => {
				const res = await request('/api/v1/transactions', {
					method: 'POST',
					body: JSON.stringify(params)
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(`create_transaction failed: ${extractErrorMessage(err, res.status)}`);
				}
				return (await res.json()) as TransactionRecord;
			}
		}),

		create_transfer: tool({
			description: 'Catat transfer antar wallet. Selalu konfirmasi detail sebelum memanggil ini.',
			parameters: z.object({
				sourceWalletId: z.string().describe('ID wallet asal'),
				targetWalletId: z.string().describe('ID wallet tujuan'),
				amount: z.number().positive().describe('Nominal transfer'),
				adminFee: z.number().default(0).describe('Biaya admin transfer jika ada'),
				categoryId: z.string().optional().describe('ID kategori transaksi transfer jika ada'),
				description: z.string().optional().describe('Keterangan transfer'),
				date: z.string().optional().describe('Tanggal & waktu transfer format ISO-8601 (YYYY-MM-DDTHH:mm:ss+07:00) atau YYYY-MM-DD (default hari ini)'),
				transactionDate: z.string().optional().describe('Alias untuk date (format ISO-8601)')
			}),
			execute: async (params) => {
				const res = await request('/api/v1/transfers', {
					method: 'POST',
					body: JSON.stringify(params)
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(`create_transfer failed: ${extractErrorMessage(err, res.status)}`);
				}
				return await res.json();
			}
		}),

		update_transaction: tool({
			description: 'Ubah data transaksi yang sudah ada. Konfirmasi dulu sebelum mengubah.',
			parameters: z.object({
				transactionId: z.string().describe('ID transaksi yang akan diubah'),
				amount: z.number().positive().optional(),
				adminFee: z.number().optional(),
				type: z.enum(['expense', 'income', 'transfer']).optional(),
				walletId: z.string().optional(),
				targetWalletId: z.string().nullable().optional(),
				categoryId: z.string().nullable().optional(),
				budgetId: z.string().nullable().optional().describe('ID UUID budget terkait'),
				description: z.string().nullable().optional(),
				date: z.string().optional().describe('Tanggal & waktu transaksi baru. Format ISO-8601 lengkap (YYYY-MM-DDTHH:mm:ss+07:00) jika mengubah jam/menit, atau YYYY-MM-DD.'),
				transactionDate: z.string().optional().describe('Alias untuk date (format ISO-8601)'),
				isPlanned: z.boolean().optional()
			}),
			execute: async ({ transactionId, ...delta }) => {
				const res = await request(`/api/v1/transactions/${transactionId}`, {
					method: 'PATCH',
					body: JSON.stringify(delta)
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(`update_transaction failed: ${extractErrorMessage(err, res.status)}`);
				}
				return (await res.json()) as TransactionRecord;
			}
		}),

		delete_transaction: tool({
			description: 'Hapus transaksi. WAJIB minta konfirmasi eksplisit dari pengguna sebelum memanggil ini.',
			parameters: z.object({
				transactionId: z.string().describe('ID transaksi yang akan dihapus'),
				confirmed: z.boolean().describe('Harus bernilai true untuk konfirmasi')
			}),
			execute: async ({ transactionId, confirmed }) => {
				if (!confirmed) {
					return {
						status: 'confirmation_required',
						message: `Apakah Anda yakin ingin menghapus transaksi ${transactionId}? Mohon konfirmasi.`
					};
				}
				const res = await request(`/api/v1/transactions/${transactionId}`, {
					method: 'DELETE'
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(`delete_transaction failed: ${extractErrorMessage(err, res.status)}`);
				}
				return { status: 'deleted', transactionId };
			}
		})
	};
}
