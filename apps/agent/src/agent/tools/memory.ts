/// <reference types="@cloudflare/workers-types" />
import { tool } from 'ai';
import { z } from 'zod';
import { upsertAgentMemory } from '../../db/queries.js';

export function createMemoryTools(db: D1Database, userId: string) {
	return {
		save_memory: tool({
			description: 'Simpan konteks penting ke memori jangka panjang Eve (misal alias/nama dompet, pola arus kas, preferensi tampilan tabel/gaya, nomor rekening keluarga, komitmen finansial berulang). Gunakan saat pengguna meminta untuk mengingat sesuatu.',
			parameters: z.object({
				key: z.enum(['walletNicknames', 'cashflowPattern', 'formattingPreferences', 'customContext']).describe('Kategori memori yang disimpan'),
				walletNickname: z.object({
					walletId: z.string().describe('ID UUID dompet atau nama dompet'),
					nickname: z.string().describe('Alias/nama panggilan dompet, misal "Rekening Gaji", "Dompet Masak"')
				}).optional().describe('Digunakan jika key = walletNicknames'),
				value: z.string().describe('Teks konteks yang diingat (jika key = cashflowPattern, formattingPreferences, atau customContext)')
			}),
			execute: async ({ key, walletNickname, value }) => {
				if (key === 'walletNicknames' && walletNickname) {
					await upsertAgentMemory(db, userId, {
						walletNicknames: { [walletNickname.walletId]: walletNickname.nickname }
					});
					return {
						status: 'saved',
						message: `Tersimpan di memori: Dompet "${walletNickname.walletId}" dicatat sebagai "${walletNickname.nickname}".`
					};
				}

				if (key === 'formattingPreferences') {
					await upsertAgentMemory(db, userId, {
						formattingPreferences: [value]
					});
					return {
						status: 'saved',
						message: `Tersimpan di memori preferensi format: "${value}".`
					};
				}

				if (key === 'cashflowPattern') {
					await upsertAgentMemory(db, userId, {
						cashflowPattern: value
					});
					return {
						status: 'saved',
						message: `Tersimpan di memori pola arus kas: "${value}".`
					};
				}

				// customContext
				await upsertAgentMemory(db, userId, {
					customContext: value
				});
				return {
					status: 'saved',
					message: `Tersimpan di memori konteks kustom: "${value}".`
				};
			}
		})
	};
}
