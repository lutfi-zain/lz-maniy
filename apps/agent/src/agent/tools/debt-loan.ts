/// <reference types="@cloudflare/workers-types" />
import { tool } from 'ai';
import { z } from 'zod';
import { createApiClient, extractErrorMessage } from './http.js';

export function createDebtLoanTools(reedrichUrl: string, token: string, fetcher?: Fetcher) {
	const { request } = createApiClient(reedrichUrl, token, fetcher);

	return {
		list_debts_loans: tool({
			description: 'Ambil daftar seluruh kewajiban hutang (debt) atau piutang (loan), sisa tagihan, nama pihak terkait, status bayar, dan tanggal jatuh tempo.',
			parameters: z.object({
				status: z.enum(['unpaid', 'partially_paid', 'paid']).optional().describe('Filter status pelunasan'),
				type: z.enum(['debt', 'loan']).optional().describe('Filter jenis: debt (hutang kita) atau loan (piutang/orang lain hutang ke kita)')
			}),
			execute: async (params) => {
				const query = new URLSearchParams();
				if (params.status) query.set('status', params.status);
				if (params.type) query.set('type', params.type);

				const res = await request(`/api/v1/debts-loans${query.toString() ? `?${query}` : ''}`);
				if (!res.ok) throw new Error(`list_debts_loans failed: ${res.status}`);
				return await res.json();
			}
		}),

		create_debt_loan: tool({
			description: 'Catat perjanjian hutang atau piutang baru.',
			parameters: z.object({
				personName: z.string().min(1).describe('Nama pihak kedua, misal "Abi", "Istri", "Teman"'),
				amount: z.number().positive().describe('Nominal total hutang/piutang'),
				type: z.enum(['debt', 'loan']).default('debt').describe('"debt" = hutang kita, "loan" = piutang kita'),
				walletId: z.string().optional().describe('ID UUID dompet yang menerima atau mengeluarkan dana'),
				dueDate: z.string().optional().describe('Tanggal jatuh tempo (YYYY-MM-DD)'),
				notes: z.string().optional().describe('Catatan rincian hutang/piutang'),
				adjustWalletBalance: z.boolean().default(false).describe('Jika true, saldo dompet akan otomatis disesuaikan')
			}),
			execute: async (params) => {
				const res = await request('/api/v1/debts-loans', {
					method: 'POST',
					body: JSON.stringify(params)
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(`create_debt_loan failed: ${extractErrorMessage(err, res.status)}`);
				}
				return await res.json();
			}
		}),

		repay_debt_loan: tool({
			description: 'Catat pembayaran atau cicilan pelunasan hutang/piutang.',
			parameters: z.object({
				debtLoanId: z.string().describe('ID UUID hutang/piutang yang dibayar'),
				amount: z.number().positive().describe('Nominal yang dibayar/dilunasi'),
				walletId: z.string().optional().describe('ID UUID dompet asal atau penerima pelunasan'),
				adjustWalletBalance: z.boolean().default(false).describe('Apakah saldo dompet ikut disesuaikan otomatis')
			}),
			execute: async ({ debtLoanId, ...body }) => {
				const res = await request(`/api/v1/debts-loans/${debtLoanId}/repay`, {
					method: 'POST',
					body: JSON.stringify(body)
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(`repay_debt_loan failed: ${extractErrorMessage(err, res.status)}`);
				}
				return await res.json();
			}
		}),

		update_debt_loan: tool({
			description: 'Ubah keterangan atau tanggal jatuh tempo hutang/piutang.',
			parameters: z.object({
				debtLoanId: z.string().describe('ID UUID hutang/piutang'),
				personName: z.string().optional(),
				dueDate: z.string().optional().describe('Tanggal jatuh tempo baru (YYYY-MM-DD)'),
				notes: z.string().optional()
			}),
			execute: async ({ debtLoanId, ...delta }) => {
				const res = await request(`/api/v1/debts-loans/${debtLoanId}`, {
					method: 'PATCH',
					body: JSON.stringify(delta)
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(`update_debt_loan failed: ${extractErrorMessage(err, res.status)}`);
				}
				return await res.json();
			}
		}),

		delete_debt_loan: tool({
			description: 'Hapus data pencatatan hutang/piutang secara permanen.',
			parameters: z.object({
				debtLoanId: z.string().describe('ID UUID hutang/piutang yang akan dihapus')
			}),
			execute: async ({ debtLoanId }) => {
				const res = await request(`/api/v1/debts-loans/${debtLoanId}`, {
					method: 'DELETE'
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(`delete_debt_loan failed: ${extractErrorMessage(err, res.status)}`);
				}
				return await res.json();
			}
		})
	};
}
