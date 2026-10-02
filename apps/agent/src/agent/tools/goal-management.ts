/// <reference types="@cloudflare/workers-types" />
import { tool } from 'ai';
import { z } from 'zod';
import { createApiClient, extractErrorMessage } from './http.js';

export function createGoalTools(reedrichUrl: string, token: string, fetcher?: Fetcher) {
	const { request } = createApiClient(reedrichUrl, token, fetcher);

	return {
		list_goals: tool({
			description: 'Ambil daftar seluruh target tabungan (goal), progres akumulasi, sisa target, estimasi pacing, dan kebutuhan tabungan bulanan.',
			parameters: z.object({
				status: z.enum(['in_progress', 'completed', 'cancelled']).optional().describe('Filter status target')
			}),
			execute: async (params) => {
				const query = params.status ? `?status=${params.status}` : '';
				const res = await request(`/api/v1/goals${query}`);
				if (!res.ok) throw new Error(`list_goals failed: ${res.status}`);
				return await res.json();
			}
		}),

		create_goal: tool({
			description: 'Buat target tabungan (goal) baru, misal "Sewa Rumah 2026", "Dana Darurat", "Tabungan Lebaran".',
			parameters: z.object({
				name: z.string().min(1).describe('Nama target tabungan'),
				targetAmount: z.number().positive().describe('Nominal target tabungan'),
				currentAmount: z.number().default(0).describe('Saldo awal yang sudah terkumpul'),
				currency: z.string().default('IDR'),
				targetDate: z.string().optional().describe('Batas waktu target (YYYY-MM-DD)'),
				walletId: z.string().optional().describe('ID UUID dompet yang ditautkan ke target ini'),
				walletIds: z.array(z.string()).optional().describe('Daftar ID UUID dompet yang ditautkan'),
				categoryId: z.string().optional().describe('ID UUID kategori terkait'),
				notes: z.string().optional().describe('Catatan rincian goal')
			}),
			execute: async (params) => {
				const res = await request('/api/v1/goals', {
					method: 'POST',
					body: JSON.stringify(params)
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(`create_goal failed: ${extractErrorMessage(err, res.status)}`);
				}
				return await res.json();
			}
		}),

		update_goal: tool({
			description: 'Ubah data target tabungan (nama, nominal target, saldo saat ini, status, atau target tanggal).',
			parameters: z.object({
				goalId: z.string().describe('ID UUID target yang akan diubah'),
				name: z.string().optional(),
				targetAmount: z.number().positive().optional(),
				currentAmount: z.number().optional(),
				currency: z.string().optional(),
				targetDate: z.string().optional().describe('Tanggal target baru (YYYY-MM-DD)'),
				status: z.enum(['in_progress', 'completed', 'cancelled']).optional(),
				notes: z.string().optional()
			}),
			execute: async ({ goalId, ...delta }) => {
				const res = await request(`/api/v1/goals/${goalId}`, {
					method: 'PATCH',
					body: JSON.stringify(delta)
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(`update_goal failed: ${extractErrorMessage(err, res.status)}`);
				}
				return await res.json();
			}
		}),

		delete_goal: tool({
			description: 'Hapus target tabungan. Dompet yang tertaut tidak akan terhapus.',
			parameters: z.object({
				goalId: z.string().describe('ID UUID target yang akan dihapus')
			}),
			execute: async ({ goalId }) => {
				const res = await request(`/api/v1/goals/${goalId}`, {
					method: 'DELETE'
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(`delete_goal failed: ${extractErrorMessage(err, res.status)}`);
				}
				return await res.json();
			}
		}),

		link_goal_wallet: tool({
			description: 'Tautkan dompet/rekening tertentu ke target tabungan agar saldonya otomatis terhitung dalam akumulasi progres.',
			parameters: z.object({
				goalId: z.string().describe('ID UUID target tabungan'),
				walletId: z.string().describe('ID UUID dompet yang akan ditautkan')
			}),
			execute: async ({ goalId, walletId }) => {
				const res = await request(`/api/v1/goals/${goalId}/wallets`, {
					method: 'POST',
					body: JSON.stringify({ walletId })
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(`link_goal_wallet failed: ${extractErrorMessage(err, res.status)}`);
				}
				return await res.json();
			}
		}),

		unlink_goal_wallet: tool({
			description: 'Lepaskan tautan dompet dari target tabungan.',
			parameters: z.object({
				goalId: z.string().describe('ID UUID target tabungan'),
				walletId: z.string().describe('ID UUID dompet yang akan dilepas tautannya')
			}),
			execute: async ({ goalId, walletId }) => {
				const res = await request(`/api/v1/goals/${goalId}/wallets/${walletId}`, {
					method: 'DELETE'
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(`unlink_goal_wallet failed: ${extractErrorMessage(err, res.status)}`);
				}
				return await res.json();
			}
		})
	};
}
