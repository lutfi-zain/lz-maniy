/// <reference types="@cloudflare/workers-types" />
import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import {
	parseStatementPdf,
	StatementParseError,
	type SegmentedStatement
} from '../agent/statements.js';
import type { Env } from '../types.js';
import type { StatementFileStatus, StatementParseResult } from '@maniyy/shared';

const statementsRouter = new Hono<{ Bindings: Env }>();

statementsRouter.use('*', authMiddleware);

const STATEMENT_TTL_SECONDS = 60 * 60 * 24;
const MAX_FILES = 10;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const ROWS_PER_SHARD = 500;

function shardKey(userId: string, sessionId: string, fileIdx: number): string {
	return `stmt:${userId}:${sessionId}:${fileIdx}`;
}

function manifestKey(userId: string, sessionId: string): string {
	return `stmt:${userId}:${sessionId}:manifest`;
}

statementsRouter.post('/parse', async (c) => {
	const user = c.get('user');
	const form = await c.req.formData();
	const files = form.getAll('files').filter((f): f is File => f instanceof File);

	if (files.length === 0) {
		return c.json({ error: 'bad_request', message: 'Tidak ada file PDF.' }, 400);
	}
	if (files.length > MAX_FILES) {
		return c.json(
			{ error: 'bad_request', message: `Maksimal ${MAX_FILES} file per permintaan.` },
			400
		);
	}

	const sessionId = crypto.randomUUID();
	const fileStatuses: StatementFileStatus[] = [];
	let totalPages = 0;
	let totalRows = 0;
	let fileIdx = 0;

	for (const file of files) {
		if (file.size > MAX_FILE_BYTES) {
			fileStatuses.push({
				fileName: file.name,
				status: 'error',
				error: `Ukuran melebihi ${MAX_FILE_BYTES / 1024 / 1024}MB.`
			});
			continue;
		}
		if (file.type && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
			fileStatuses.push({
				fileName: file.name,
				status: 'error',
				error: 'Bukan file PDF.'
			});
			continue;
		}
		try {
			const bytes = new Uint8Array(await file.arrayBuffer());
			const segmented: SegmentedStatement = await parseStatementPdf(bytes);
			const rows = segmented.rows;
			for (let i = 0; i < rows.length; i += ROWS_PER_SHARD) {
				await c.env.CONFIG.put(
					shardKey(user.userId, sessionId, fileIdx) + `:${Math.floor(i / ROWS_PER_SHARD)}`,
					JSON.stringify(rows.slice(i, i + ROWS_PER_SHARD)),
					{ expirationTtl: STATEMENT_TTL_SECONDS }
				);
			}
			fileStatuses.push({
				fileName: file.name,
				status: 'ready',
				pageCount: segmented.pageCount,
				rowCount: rows.length,
				bank: segmented.bank
			});
			totalPages += segmented.pageCount;
			totalRows += rows.length;
			fileIdx++;
		} catch (err) {
			const message = err instanceof StatementParseError ? err.message : 'Gagal mem-parse PDF.';
			fileStatuses.push({ fileName: file.name, status: 'error', error: message });
		}
	}

	await c.env.CONFIG.put(
		manifestKey(user.userId, sessionId),
		JSON.stringify({ files: fileStatuses, totalPages, totalRows, fileCount: fileIdx }),
		{ expirationTtl: STATEMENT_TTL_SECONDS }
	);

	const result: StatementParseResult = {
		sessionId,
		files: fileStatuses,
		totalPages,
		totalRows
	};
	return c.json(result);
});

export { statementsRouter };
