/// <reference types="@cloudflare/workers-types" />
import { tool } from 'ai';
import { z } from 'zod';
import type { StatementRow } from '@maniy/shared';
import { readStatementManifest, readStatementShard } from '../statements.js';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export function createStatementTools(kv: KVNamespace, userId: string) {
	return {
		get_statement_rows: tool({
			description:
				'Ambil baris rekening koran dari sesi statement yang diunggah pengguna. Gunakan untuk membaca mutasi bank sebelum memberi insight atau menyusun draf transaksi. Selalu konfirmasi ke pengguna sebelum mencatat transaksi dari baris ini.',
			parameters: z.object({
				sessionId: z.string().describe('ID sesi statement dari hasil parse'),
				page: z.number().int().min(1).default(1).describe('Halaman baris (mulai dari 1)'),
				pageSize: z
					.number()
					.int()
					.min(1)
					.max(MAX_PAGE_SIZE)
					.default(DEFAULT_PAGE_SIZE)
					.describe('Jumlah baris per halaman'),
				q: z.string().optional().describe('Filter teks pada keterangan atau nominal')
			}),
			execute: async ({ sessionId, page, pageSize, q }) => {
				if (!/^[0-9a-f-]{8,64}$/i.test(sessionId)) {
					throw new Error('get_statement_rows failed: sessionId tidak valid.');
				}
				const manifest = await readStatementManifest(kv, userId, sessionId);
				if (!manifest) {
					throw new Error(
						'get_statement_rows failed: sesi statement kedaluwarsa atau tidak ditemukan. Minta pengguna mengunggah ulang PDF.'
					);
				}
				const size = Math.min(pageSize, MAX_PAGE_SIZE);
				const query = (q ?? '').trim().toLowerCase();
				const collected: StatementRow[] = [];
				let shardIdx = 0;
				let fileIdx = 0;
				let guard = 0;
				while (collected.length < page * size && guard < 500) {
					guard++;
					const shard = await readStatementShard(kv, userId, sessionId, fileIdx, shardIdx);
					if (shard.length === 0) {
						fileIdx++;
						shardIdx = 0;
						if (fileIdx >= manifest.fileCount) break;
						continue;
					}
					collected.push(...shard);
					shardIdx++;
				}
				const filtered = query
					? collected.filter(
							(r) =>
								r.description.toLowerCase().includes(query) ||
								String(r.amount).includes(query)
						)
					: collected;
				const total = query ? filtered.length : manifest.totalRows;
				const start = (page - 1) * size;
				return {
					sessionId,
					page,
					pageSize: size,
					total,
					totalPages: manifest.totalPages,
					rows: filtered.slice(start, start + size)
				};
			}
		})
	};
}
