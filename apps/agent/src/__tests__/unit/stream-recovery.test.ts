import { describe, it, expect, vi } from 'vitest';
import { attemptFallbackSynthesis } from '../../routes/chat.js';
import type { LanguageModelV1 } from 'ai';
import type * as AiModule from 'ai';

vi.mock('ai', async (importOriginal) => {
	const actual = await importOriginal<typeof AiModule>();
	return {
		...actual,
		generateText: vi.fn(async ({ prompt }: { prompt: string }) => {
			if (prompt.includes('trigger_error')) {
				throw new Error('Upstream model error');
			}
			return {
				text: 'Berdasarkan data keuangan Anda, DP mobil 50 juta idealnya tercapai di Desember 2027.'
			};
		})
	};
});

describe('Defensive Stream Recovery', () => {
	const dummyModel = {} as unknown as LanguageModelV1;

	it('returns null when toolData is empty', async () => {
		const res = await attemptFallbackSynthesis(dummyModel, 'Pertanyaan', []);
		expect(res).toBeNull();
	});

	it('synthesizes text when tool data is available', async () => {
		const toolData = [
			{
				periods: [
					{ month: '2027-11', spendableNetWorth: 52000000 }
				]
			}
		];

		const res = await attemptFallbackSynthesis(
			dummyModel,
			'Kapan DP 50 juta bisa tercapai?',
			toolData
		);

		expect(res).toContain('DP mobil 50 juta idealnya tercapai di Desember 2027');
	});
	it('synthesizes multi-tool results from horizon_projection and wallets', async () => {
		const multiToolData = [
			{
				toolName: 'list_wallets',
				args: {},
				result: [{ walletId: 'w-1', name: 'BCA Main', balance: 185543 }]
			},
			{
				toolName: 'horizon_projection',
				args: { months: 14 },
				result: {
					baseCurrency: 'IDR',
					periods: [
						{ month: '2026-10', spendableNetWorth: 200000 },
						{ month: '2027-11', spendableNetWorth: 52000000 }
					]
				}
			}
		];

		const res = await attemptFallbackSynthesis(
			dummyModel,
			'kalau saya mau beli mobil lagi tahun depan dengan DP50 juta bisa di bulan apa idealnya?',
			multiToolData
		);

		expect(res).not.toBeNull();
		expect(res).toContain('DP mobil 50 juta');
	});


	it('catches model errors and returns null gracefully without throwing', async () => {
		const toolData = [{ data: 'some_data' }];
		const res = await attemptFallbackSynthesis(
			dummyModel,
			'trigger_error',
			toolData
		);

		expect(res).toBeNull();
	});
});
