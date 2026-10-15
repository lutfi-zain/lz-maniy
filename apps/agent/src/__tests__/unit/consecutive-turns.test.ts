import { describe, it, expect } from 'vitest';
import { sanitizeHistoryForModel, type HistoryMessage } from '../../agent/history.js';

describe('Multi-Turn History Sanitizer (consecutive-turns)', () => {
	it('returns empty array when input history is empty or nullish', () => {
		expect(sanitizeHistoryForModel([])).toEqual([]);
		expect(sanitizeHistoryForModel(null as unknown as HistoryMessage[])).toEqual([]);
	});

	it('preserves clean alternating history without modification', () => {
		const clean: HistoryMessage[] = [
			{ role: 'user', content: 'Halo' },
			{ role: 'assistant', content: 'Halo! Ada yang bisa dibantu?' },
			{ role: 'user', content: 'Saldo saya berapa?' },
			{ role: 'assistant', content: 'Saldo Anda Rp 5.000.000.' }
		];

		const result = sanitizeHistoryForModel(clean);
		expect(result).toEqual(clean);
	});

	it('collapses consecutive duplicate user roles to the latest turn', () => {
		const duplicateUsers: HistoryMessage[] = [
			{ role: 'user', content: 'Pertanyaan lama' },
			{ role: 'user', content: 'Pertanyaan baru setelah edit' },
			{ role: 'assistant', content: 'Jawaban' }
		];

		const result = sanitizeHistoryForModel(duplicateUsers);
		expect(result).toEqual([
			{ role: 'user', content: 'Pertanyaan baru setelah edit' },
			{ role: 'assistant', content: 'Jawaban' }
		]);
	});

	it('collapses consecutive duplicate assistant roles to the latest turn', () => {
		const duplicateAssistants: HistoryMessage[] = [
			{ role: 'user', content: 'Halo' },
			{ role: 'assistant', content: 'Jawaban lama' },
			{ role: 'assistant', content: 'Jawaban revisi' }
		];

		const result = sanitizeHistoryForModel(duplicateAssistants);
		expect(result).toEqual([
			{ role: 'user', content: 'Halo' },
			{ role: 'assistant', content: 'Jawaban revisi' }
		]);
	});

	it('prunes dangling trailing user turns when ensureEndsWithAssistant is true', () => {
		const danglingHistory: HistoryMessage[] = [
			{ role: 'user', content: 'Turn 1' },
			{ role: 'assistant', content: 'Balasan 1' },
			{ role: 'user', content: 'Turn 2 yang crash di Step 2' }
		];

		const result = sanitizeHistoryForModel(danglingHistory, { ensureEndsWithAssistant: true });
		expect(result).toEqual([
			{ role: 'user', content: 'Turn 1' },
			{ role: 'assistant', content: 'Balasan 1' }
		]);
	});

	it('returns empty array when history only consists of a single crashed user turn with ensureEndsWithAssistant', () => {
		const singleCrashedUser: HistoryMessage[] = [
			{ role: 'user', content: 'kalau saya mau beli mobil lagi tahun depan dengan DP50 juta bisa di bulan apa idealnya?' }
		];

		const result = sanitizeHistoryForModel(singleCrashedUser, { ensureEndsWithAssistant: true });
		expect(result).toEqual([]);
	});

	it('ignores unknown or system roles from model payload', () => {
		const mixed: HistoryMessage[] = [
			{ role: 'system', content: 'System instruction' },
			{ role: 'user', content: 'Halo' },
			{ role: 'tool', content: 'Tool execution' },
			{ role: 'assistant', content: 'Halo!' }
		];

		const result = sanitizeHistoryForModel(mixed);
		expect(result).toEqual([
			{ role: 'user', content: 'Halo' },
			{ role: 'assistant', content: 'Halo!' }
		]);
	});
});
