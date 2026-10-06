import { describe, it, expect } from 'vitest';
import {
	segmentStatementText,
	parseStatementPdf,
	StatementParseError,
	readStatementManifest,
	readStatementShard
} from '../../agent/statements.js';

const BCA_LIKE = [
	'PT BANK BCA TBK',
	'REKENING KORAN PERIODE 01/10/2026 - 06/10/2026',
	'01/10/2026 TRF E-BANKING DB 5.000.000,00 SALDO 10.000.000,00',
	'02/10/2026 SETORAN TUNAI CR 2.500.000,00 SALDO 12.500.000,00',
	'03/10/2026 TARIK TUNAI ATM DB 1.000.000,00 SALDO 11.500.000,00'
];

const MANDIRI_LIKE = [
	'PT BANK MANDIRI (PERSERO) TBK',
	'MUTASI REKENING',
	'2026-10-01 GAJI BULANAN CR 15.000.000.00',
	'2026-10-02 PAYMENT LISTRIK DB 500.000.00',
	'2026-10-03 TRANSFER KELUAR DB 3.000.000.00'
];

describe('segmentStatementText fixtures', () => {
	it('segments BCA-like rows with debit/credit directions', () => {
		const result = segmentStatementText(BCA_LIKE);
		expect(result.bank).toBe('BCA');
		expect(result.pageCount).toBe(5);
		expect(result.rows.length).toBe(3);
		expect(result.rows[0]).toMatchObject({
			date: '2026-10-01',
			amount: 5000000,
			direction: 'out'
		});
		expect(result.rows[1]).toMatchObject({ direction: 'in', amount: 2500000 });
		expect(result.rows[2]).toMatchObject({ direction: 'out', amount: 1000000 });
	});

	it('segments Mandiri-like ISO dates', () => {
		const result = segmentStatementText(MANDIRI_LIKE);
		expect(result.bank).toBe('MANDIRI');
		expect(result.rows.length).toBe(3);
		expect(result.rows[0]).toMatchObject({
			date: '2026-10-01',
			amount: 15000000,
			direction: 'in'
		});
		expect(result.rows[1].direction).toBe('out');
	});

	it('skips header lines without dates or amounts', () => {
		const result = segmentStatementText(['BANK JAGO LAPORAN', 'SALDO AWAL']);
		expect(result.rows).toEqual([]);
	});
});

describe('parseStatementPdf rejections', () => {
	it('rejects empty page sets', async () => {
		const enc = new TextEncoder();
		const empty = enc.encode(
			'%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>'
		);
		await expect(parseStatementPdf(empty)).rejects.toMatchObject({ code: 'empty' });
	});

	it('exposes typed error codes', () => {
		const err = new StatementParseError('over_cap', 'x');
		expect(err.code).toBe('over_cap');
		expect(err).toBeInstanceOf(Error);
	});
});

describe('statement KV readers TTL-miss', () => {
	function mockKv(values: Record<string, string | null>) {
		return {
			get: async (key: string) => values[key] ?? null
		} as unknown as KVNamespace;
	}

	it('returns null when manifest is missing (expired)', async () => {
		const kv = mockKv({});
		await expect(readStatementManifest(kv, 'u1', 's1')).resolves.toBeNull();
	});

	it('returns manifest when present', async () => {
		const kv = mockKv({
			'stmt:u1:s1:manifest': JSON.stringify({ files: [], totalPages: 1, totalRows: 2, fileCount: 1 })
		});
		await expect(readStatementManifest(kv, 'u1', 's1')).resolves.toMatchObject({
			totalRows: 2
		});
	});

	it('returns empty array when shard is missing (expired)', async () => {
		const kv = mockKv({});
		await expect(readStatementShard(kv, 'u1', 's1', 0, 0)).resolves.toEqual([]);
	});
});
