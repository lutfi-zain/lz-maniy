import { tool } from 'ai';
import { z } from 'zod';

export function createUICommandTools() {
	return {
		navigate_page: tool({
			description: 'Navigasi ke halaman lain di aplikasi.',
			parameters: z.object({
				route: z.enum(['/', '/planning', '/ledger', '/accounts']).describe('Halaman tujuan'),
				message: z.string().describe('Penjelasan singkat untuk pengguna')
			}),
			execute: async ({ route, message }) => ({
				type: 'ui_command' as const,
				command: 'navigate' as const,
				payload: { route },
				message
			})
		}),

		change_filter: tool({
			description: 'Ubah filter institusi/bank pada dashboard.',
			parameters: z.object({
				institution: z.string().nullable().describe('Nama institusi atau null untuk semua'),
				message: z.string().describe('Penjelasan singkat untuk pengguna')
			}),
			execute: async ({ institution, message }) => ({
				type: 'ui_command' as const,
				command: 'filter' as const,
				payload: { institution },
				message
			})
		}),

		change_tab: tool({
			description: 'Ganti tab aktif di dashboard (semua/spendable/terkunci).',
			parameters: z.object({
				tab: z.enum(['all', 'spendable', 'locked']).describe('Tab yang ingin ditampilkan'),
				message: z.string().describe('Penjelasan singkat untuk pengguna')
			}),
			execute: async ({ tab, message }) => ({
				type: 'ui_command' as const,
				command: 'tab' as const,
				payload: { tab },
				message
			})
		}),

		change_date_range: tool({
			description: 'Ubah rentang tanggal yang ditampilkan.',
			parameters: z.object({
				start: z.string().describe('Tanggal mulai format YYYY-MM-DD'),
				end: z.string().describe('Tanggal akhir format YYYY-MM-DD'),
				message: z.string().describe('Penjelasan singkat untuk pengguna')
			}),
			execute: async ({ start, end, message }) => ({
				type: 'ui_command' as const,
				command: 'date_range' as const,
				payload: { start, end },
				message
			})
		}),

		open_drawer: tool({
			description: 'Buka panel detail untuk wallet, kategori, budget, goal, atau obligasi.',
			parameters: z.object({
				drawerType: z.enum(['wallet', 'category', 'budget', 'goal', 'obligation', 'networth']).describe('Tipe drawer'),
				title: z.string().describe('Judul drawer'),
				subtitle: z.string().describe('Subjudul drawer'),
				badge: z.string().describe('Badge teks'),
				data: z.record(z.unknown()).describe('Data yang ditampilkan di drawer'),
				message: z.string().describe('Penjelasan singkat untuk pengguna')
			}),
			execute: async ({ drawerType, title, subtitle, badge, data, message }) => ({
				type: 'ui_command' as const,
				command: 'drawer' as const,
				payload: { type: drawerType, title, subtitle, badge, data },
				message
			})
		}),

		open_transaction_form: tool({
			description: 'Buka form pencatatan transaksi baru.',
			parameters: z.object({
				message: z.string().describe('Penjelasan singkat untuk pengguna')
			}),
			execute: async ({ message }) => ({
				type: 'ui_command' as const,
				command: 'transaction_form' as const,
				payload: {},
				message
			})
		}),

		focus_element: tool({
			description: 'Fokus ke elemen UI tertentu menggunakan CSS selector.',
			parameters: z.object({
				selector: z.string().describe('CSS selector elemen tujuan'),
				message: z.string().describe('Penjelasan singkat untuk pengguna')
			}),
			execute: async ({ selector, message }) => ({
				type: 'ui_command' as const,
				command: 'focus' as const,
				payload: { selector },
				message
			})
		})
	};
}
