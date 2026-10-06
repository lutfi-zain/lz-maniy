import { describe, it, expect, vi } from 'vitest';
import { createStatementTools } from '../../agent/tools/statements.js';

function mockKv(shards: Record<string, unknown>) {
	return {
		get: async (key: string) => {
			const v = shards[key];
			return v === undefined ? null : JSON.stringify(v);
		}
	} as unknown as KVNamespace;
}

const MANIFEST = {
	files: [{ fileName: 'bca.pdf', rowCount: 3 }],
	totalPages: 1,
	totalRows: 3,
	fileCount: 1
};

const ROWS = [
	{ date: '2026-10-01', description: 'TRF E-BANKING DB', amount: 5000000, direction: 'out', page: 1 },
	{ date: '2026-10-02', description: 'SETORAN TUNAI CR', amount: 2500000, direction: 'in', page: 1 },
	{ date: '2026-10-03', description: 'TARIK TUNAI ATM', amount: 1000000, direction: 'out', page: 1 }
];

const SESSION = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

function kvWithSession() {
	return mockKv({
		[`stmt:usr-123:${SESSION}:manifest`]: MANIFEST,
		[`stmt:usr-123:${SESSION}:0:0`]: ROWS
	});
}

describe('createStatementTools', () => {
	it('pages statement rows with totals', async () => {
		const tools = createStatementTools(kvWithSession(), 'usr-123');
		const res = await tools.get_statement_rows.execute(
			{ sessionId: SESSION, page: 1, pageSize: 2 },
			{ toolCallId: '1', messages: [] }
		);
		expect(res.total).toBe(3);
		expect(res.rows.length).toBe(2);
		expect(res.rows[0].amount).toBe(5000000);
	});

	it('searches rows by description text', async () => {
		const tools = createStatementTools(kvWithSession(), 'usr-123');
		const res = await tools.get_statement_rows.execute(
			{ sessionId: SESSION, page: 1, pageSize: 25, q: 'setoran' },
			{ toolCallId: '1', messages: [] }
		);
		expect(res.rows.length).toBe(1);
		expect(res.rows[0].direction).toBe('in');
	});

	it('enforces userId ownership on session keys', async () => {
		const otherKv = mockKv({
			[`stmt:usr-999:${SESSION}:manifest`]: MANIFEST,
			[`stmt:usr-999:${SESSION}:0:0`]: ROWS
		});
		const tools = createStatementTools(otherKv, 'usr-123');
		await expect(
			tools.get_statement_rows.execute(
				{ sessionId: SESSION, page: 1, pageSize: 25 },
				{ toolCallId: '1', messages: [] }
			)
		).rejects.toThrow(/kedaluwarsa|tidak ditemukan/);
	});

	it('returns a clear error for expired sessions', async () => {
		const tools = createStatementTools(mockKv({}), 'usr-123');
		await expect(
			tools.get_statement_rows.execute(
				{ sessionId: SESSION, page: 1, pageSize: 25 },
				{ toolCallId: '1', messages: [] }
			)
		).rejects.toThrow(/unggah ulang/);
	});

	it('rejects malformed session ids', async () => {
		const tools = createStatementTools(kvWithSession(), 'usr-123');
		await expect(
			tools.get_statement_rows.execute(
				{ sessionId: '../../etc', page: 1, pageSize: 25 },
				{ toolCallId: '1', messages: [] }
			)
		).rejects.toThrow(/tidak valid/);
	});
});
