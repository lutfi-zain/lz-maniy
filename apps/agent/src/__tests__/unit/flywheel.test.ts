import { describe, it, expect, vi, beforeEach } from 'vitest';
import { classifyFailureCategory } from '../../observability/flywheel.js';
import {
	exportCandidatesToDataset,
	pushToLangfuseDataset,
	pushToPhoenixDataset
} from '../../../eval/flywheel-sync.js';
import type { DBEvalCandidate } from '../../db/queries.js';
import fs from 'node:fs';

describe('Production-to-Dataset Flywheel Pipeline', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('classifies failure categories into canonical 14 types', () => {
		expect(classifyFailureCategory('Saldo USDT saya berapa?', '', 'normal')).toBe('multi_currency');
		expect(classifyFailureCategory('Berapa safe to spend saya?', '', 'normal')).toBe('safe_to_spend');
		expect(classifyFailureCategory('Bisa pakai tabungan Sewa Rumah?', '', 'normal')).toBe('financial_sanity');
		expect(classifyFailureCategory('Proyeksi kas bulan depan', '', 'normal')).toBe('planning_projection');
		expect(classifyFailureCategory('Catat beli kopi 25rb', '', 'normal')).toBe('transaction_record');
		expect(classifyFailureCategory('Pagu anggaran makanan', '', 'normal')).toBe('budget_tracking');
		expect(classifyFailureCategory('Berapa hutang saya?', '', 'normal')).toBe('debt_management');
		expect(classifyFailureCategory('Filter transaksi bulan lalu', '', 'normal')).toBe('transaction_filter');
		expect(classifyFailureCategory('Buka drawer planning', '', 'normal')).toBe('ui_control');
		expect(classifyFailureCategory('Berapa total saldo kas?', '', 'normal')).toBe('balance_query');
		expect(classifyFailureCategory('Pertanyaan acak', 'Respon dengan emoji ⚠️', 'code_eval_failure')).toBe('tone_format');
	});

	it('serializes candidates and appends to dataset content without syntax corruption', () => {
		const tempFile = '/tmp/test-dataset.ts';
		const initialContent = `export const EVAL_DATASET = [\n\t{\n\t\tid: 'TC-72',\n\t\tcategory: 'tone_format',\n\t\tprompt: 'Prompt awal',\n\t\texpected: { requiredTools: [], minSteps: 1 }\n\t}\n];\n`;
		fs.writeFileSync(tempFile, initialContent, 'utf8');

		const candidates: DBEvalCandidate[] = [
			{
				id: 'cand-1',
				source_trace_id: 'tr-1',
				source_session_id: 'sess-1',
				evaluator_rubric: 'financial_soundness',
				domain_category: 'financial_sanity',
				sanitized_prompt: 'Bisakah saya pakai dana darurat?',
				sanitized_output: 'Tidak boleh.',
				sanitized_tool_calls_json: JSON.stringify([{ name: 'get_snapshot' }]),
				judge_score: 0.1,
				judge_reasoning: 'Gagal membela dana darurat.',
				status: 'staged',
				created_at: Date.now()
			}
		];

		const count = exportCandidatesToDataset(candidates, tempFile);
		expect(count).toBe(1);

		const updated = fs.readFileSync(tempFile, 'utf8');
		expect(updated).toContain("id: 'TC-73'");
		expect(updated).toContain("category: 'financial_sanity'");
		expect(updated).toContain("requiredTools: [\"get_snapshot\"]");
		expect(updated.trimEnd().endsWith('];')).toBe(true);

		fs.unlinkSync(tempFile);
	});

	it('pushes candidates to Langfuse and Phoenix datasets', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			text: async () => 'ok',
			json: async () => ({ ok: true })
		});
		globalThis.fetch = mockFetch as unknown as typeof fetch;

		const env = {
			langfuseBaseUrl: 'https://langfuse.test',
			langfusePublicKey: 'pk-test',
			langfuseSecretKey: 'sk-test',
			phoenixBaseUrl: 'https://phoenix.test',
			phoenixApiKey: 'phx-test'
		};

		const candidates: DBEvalCandidate[] = [
			{
				id: 'cand-abc12345',
				source_trace_id: 'tr-remote-1',
				source_session_id: 'sess-remote-1',
				evaluator_rubric: 'financial_soundness',
				domain_category: 'financial_sanity',
				sanitized_prompt: 'Test prompt',
				sanitized_output: 'Test output',
				sanitized_tool_calls_json: null,
				judge_score: 0.3,
				judge_reasoning: 'Failed soundness',
				status: 'staged',
				created_at: Date.now()
			}
		];

		const lfCount = await pushToLangfuseDataset(candidates, env);
		expect(lfCount).toBe(1);

		const phxCount = await pushToPhoenixDataset(candidates, env);
		expect(phxCount).toBe(1);

		expect(mockFetch).toHaveBeenCalled();
	});
});
