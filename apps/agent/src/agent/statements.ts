/// <reference types="@cloudflare/workers-types" />
import { extractText } from 'unpdf';
import type { StatementRow } from '@maniy/shared';

export const STATEMENT_MAX_PAGES = 100;
export const STATEMENT_PAGE_TEXT_LIMIT = 200_000;

export type StatementParseErrorCode =
	| 'encrypted'
	| 'scanned'
	| 'over_cap'
	| 'empty'
	| 'unreadable';

export class StatementParseError extends Error {
	code: StatementParseErrorCode;
	constructor(code: StatementParseErrorCode, message: string) {
		super(message);
		this.code = code;
	}
}

export interface SegmentedStatement {
	pageCount: number;
	rows: StatementRow[];
	bank?: string;
	period?: string;
}

const DATE_RE =
	/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b|\b(\d{4})-(\d{2})-(\d{2})\b/;
const AMOUNT_RE = /(\d{1,3}(?:[.,]\d{3})+[.,]\d{2}|\d+[.,]\d{2})/g;
const OUT_HINT = /\b(db|debet|debit|out|penarikan|tarik|bayar|payment|transfer keluar)\b/i;
const IN_HINT = /\b(cr|kredit|credit|in|setoran|masuk|gaji|salary|transfer masuk)\b/i;

function normalizeAmount(raw: string): number | null {
	const cleaned = raw.replace(/[^0-9.,]/g, '');
	if (!cleaned) return null;
	const lastDot = cleaned.lastIndexOf('.');
	const lastComma = cleaned.lastIndexOf(',');
	const decSep = lastDot > lastComma ? '.' : lastComma > -1 ? ',' : null;
	let int = cleaned;
	let frac = '';
	if (decSep) {
		const idx = decSep === '.' ? lastDot : lastComma;
		int = cleaned.slice(0, idx);
		frac = cleaned.slice(idx + 1);
	}
	int = int.replace(/[.,]/g, '');
	const value = Number(`${int || '0'}.${frac || '0'}`);
	return Number.isFinite(value) ? value : null;
}

function normalizeDate(raw: string): string | null {
	const m = raw.match(DATE_RE);
	if (!m) return null;
	if (m[4]) return `${m[4]}-${m[5]}-${m[6]}`;
	let [, d, mo, y] = m;
	if (y.length === 2) y = Number(y) > 50 ? `19${y}` : `20${y}`;
	return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function pickAmount(text: string): number | null {
	const upper = text.toUpperCase();
	const saldoIdx = upper.search(/\b(SALDO|BALANCE)\b/);
	const scope = saldoIdx > 0 ? text.slice(0, saldoIdx) : text;
	const amounts = [...scope.matchAll(AMOUNT_RE)]
		.map((m) => normalizeAmount(m[0]))
		.filter((n): n is number => n !== null && n > 0);
	if (amounts.length === 0) return null;
	return amounts[0];
}

function guessBank(fullText: string): string | undefined {
	const head = fullText.slice(0, 2000).toLowerCase();
	for (const bank of [
		'bca',
		'mandiri',
		'bri',
		'bni',
		'jago',
		'jenius',
		'bsi',
		'cimb',
		'danamon',
		'permata'
	]) {
		if (head.includes(bank)) return bank.toUpperCase();
	}
	return undefined;
}

export function segmentStatementText(pages: string[]): SegmentedStatement {
	const rows: StatementRow[] = [];
	pages.forEach((pageText, pageIdx) => {
		for (const line of pageText.split('\n')) {
			const text = line.trim();
			if (text.length < 8) continue;
			const date = normalizeDate(text);
			if (!date) continue;
			const amount = pickAmount(text);
			if (amount === null) continue;
			const direction = OUT_HINT.test(text) && !IN_HINT.test(text) ? 'out' : 'in';
			const description = text.slice(0, 280);
			rows.push({ date, description, amount, direction, page: pageIdx + 1 });
		}
	});
	const fullText = pages.join('\n');
	return { pageCount: pages.length, rows, bank: guessBank(fullText) };
}

export async function parseStatementPdf(data: Uint8Array): Promise<SegmentedStatement> {
	let pages: string[];
	try {
		const result = await extractText(data, { mergePages: false });
		pages = result.text as string[];
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		if (/encrypt|password|permission/i.test(message)) {
			throw new StatementParseError('encrypted', 'PDF diproteksi kata sandi. Gunakan ekspor tanpa PIN.');
		}
		throw new StatementParseError('unreadable', `PDF tidak dapat dibaca: ${message}`);
	}
	if (pages.length === 0) {
		throw new StatementParseError('empty', 'PDF tidak memiliki halaman.');
	}
	if (pages.length > STATEMENT_MAX_PAGES) {
		throw new StatementParseError(
			'over_cap',
			`PDF memiliki ${pages.length} halaman, melebihi batas ${STATEMENT_MAX_PAGES} halaman per file.`
		);
	}
	const nonEmpty = pages.filter((p) => p && p.trim().length > 0);
	if (nonEmpty.length === 0) {
		throw new StatementParseError(
			'scanned',
			'PDF tidak memiliki lapisan teks (kemungkinan hasil scan). Gunakan ekspor teks dari bank.'
		);
	}
	for (const p of pages) {
		if (p && p.length > STATEMENT_PAGE_TEXT_LIMIT) {
			throw new StatementParseError('unreadable', 'Satu halaman melebihi batas teks yang didukung.');
		}
	}
	return segmentStatementText(pages);
}

export interface StatementManifest {
	files: Array<{ fileName: string; rowCount?: number }>;
	totalPages: number;
	totalRows: number;
	fileCount: number;
}

export async function readStatementManifest(
	kv: KVNamespace,
	userId: string,
	sessionId: string
): Promise<StatementManifest | null> {
	const raw = await kv.get(`stmt:${userId}:${sessionId}:manifest`);
	if (!raw) return null;
	try {
		return JSON.parse(raw) as StatementManifest;
	} catch {
		return null;
	}
}

export async function readStatementShard(
	kv: KVNamespace,
	userId: string,
	sessionId: string,
	fileIdx: number,
	shardIdx: number
): Promise<StatementRow[]> {
	const raw = await kv.get(`stmt:${userId}:${sessionId}:${fileIdx}:${shardIdx}`);
	if (!raw) return [];
	try {
		return JSON.parse(raw) as StatementRow[];
	} catch {
		return [];
	}
}
