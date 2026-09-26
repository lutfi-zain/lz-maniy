/// <reference types="@cloudflare/workers-types" />
import { tool } from 'ai';
import { z } from 'zod';
import type { TransactionRecord } from '@maniyy/shared';

export function createMutationTools(reedrichUrl: string, token: string) {
	const headers = {
		Authorization: `Bearer ${token}`,
		'X-Api-Key': token,
		'Content-Type': 'application/json'
	};

	return {
		create_transaction: tool({
			description: 'Catat transaksi baru (expense atau income). Selalu konfirmasi detail sebelum memanggil ini.',
			parameters: z.object({
				walletId: z.string().describe('ID wallet sumber'),
				categoryId: z.string().describe('ID kategori'),
				amount: z.number().positive().describe('Jumlah dalam Rupiah'),
				type: z.enum(['expense', 'income']).describe('Jenis transaksi'),
				date: z.string().describe('Tanggal transaksi format YYYY-MM-DD'),
				description: z.string().optional().describe('Keterangan opsional'),
				budgetId: z.string().optional().describe('ID budget opsional'),
				adminFee: z.number().optional().describe('Biaya admin opsional'),
				isPlanned: z.boolean().optional().describe('Apakah transaksi direncanakan')
			}),
			execute: async (params) => {
				const res = await fetch(`${reedrichUrl}/api/v1/transactions`, {
					method: 'POST',
					headers,
					body: JSON.stringify(params)
				});
				if (!res.ok) {
					const err = await res.text();
					throw new Error(`create_transaction failed: ${res.status} - ${err}`);
				}
				return (await res.json()) as TransactionRecord;
			}
		}),

		create_transfer: tool({
			description: 'Catat transfer antar wallet. Selalu konfirmasi detail sebelum memanggil ini.',
			parameters: z.object({
				sourceWalletId: z.string().describe('ID wallet sumber'),
				targetWalletId: z.string().describe('ID wallet tujuan'),
				amount: z.number().positive().describe('Jumlah transfer dalam Rupiah'),
				adminFee: z.number().optional().describe('Biaya admin/transfer opsional'),
				description: z.string().optional().describe('Keterangan opsional'),
				date: z.string().optional().describe('Tanggal transfer format YYYY-MM-DD')
			}),
			execute: async (params) => {
				const res = await fetch(`${reedrichUrl}/api/v1/transfers`, {
					method: 'POST',
					headers,
					body: JSON.stringify(params)
				});
				if (!res.ok) {
					const err = await res.text();
					throw new Error(`create_transfer failed: ${res.status} - ${err}`);
				}
				return (await res.json()) as TransactionRecord;
			}
		}),

		update_transaction: tool({
			description: 'Ubah data transaksi yang sudah ada. Konfirmasi dulu sebelum mengubah.',
			parameters: z.object({
				transactionId: z.string().describe('ID transaksi yang akan diubah'),
				amount: z.number().positive().optional(),
				categoryId: z.string().optional(),
				budgetId: z.string().optional(),
				description: z.string().optional(),
				date: z.string().optional().describe('Format YYYY-MM-DD'),
				isPlanned: z.boolean().optional()
			}),
			execute: async ({ transactionId, ...delta }) => {
				const res = await fetch(`${reedrichUrl}/api/v1/transactions/${transactionId}`, {
					method: 'PATCH',
					headers,
					body: JSON.stringify(delta)
				});
				if (!res.ok) {
					const err = await res.text();
					throw new Error(`update_transaction failed: ${res.status} - ${err}`);
				}
				return (await res.json()) as TransactionRecord;
			}
		}),

		delete_transaction: tool({
			description: 'Hapus transaksi. WAJIB minta konfirmasi eksplisit dari pengguna sebelum memanggil ini.',
			parameters: z.object({
				transactionId: z.string().describe('ID transaksi yang akan dihapus'),
				confirmed: z.boolean().describe('Pengguna sudah konfirmasi penghapusan')
			}),
			execute: async ({ transactionId, confirmed }) => {
				if (!confirmed) {
					return { success: false, message: 'Penghapusan dibatalkan karena belum dikonfirmasi.' };
				}
				const res = await fetch(`${reedrichUrl}/api/v1/transactions/${transactionId}`, {
					method: 'DELETE',
					headers
				});
				if (!res.ok) {
					const err = await res.text();
					throw new Error(`delete_transaction failed: ${res.status} - ${err}`);
				}
				return { success: true, message: 'Transaksi berhasil dihapus.' };
			}
		})
	};
}
