import { scrubPII, scrubPayload } from './pii-scrubber.js';
import {
	stageEvalCandidate,
	type DBEvalQueueJob,
	type DBEvalCandidate
} from '../db/queries.js';
import type { ConsolidatedJudgeOutput } from './async-judge.js';

export const CANONICAL_CATEGORIES = [
	'balance_query',
	'planning_projection',
	'transaction_filter',
	'ui_control',
	'financial_sanity',
	'multi_currency',
	'category_breakdown',
	'wallet_management',
	'debt_management',
	'safe_to_spend',
	'transaction_record',
	'budget_tracking',
	'complex_reasoning',
	'tone_format',
	'guardrail_safety',
	'compaction_retention'
] as const;

export type DomainCategory = (typeof CANONICAL_CATEGORIES)[number];

/**
 * Classifies a failed turn into one of the 14 canonical EvalTestCase domain categories
 */
export function classifyFailureCategory(
	userMessage: string,
	assistantOutput: string,
	triggerReason: string
): DomainCategory {
	const lowerPrompt = (userMessage || '').toLowerCase();
	const lowerOutput = (assistantOutput || '').toLowerCase();
	if (
		triggerReason === 'guardrail_trip' ||
		lowerPrompt.includes('ignore previous') ||
		lowerPrompt.includes('abaikan instruksi') ||
		lowerPrompt.includes('lupakan aturan') ||
		lowerPrompt.includes('jailbreak') ||
		lowerPrompt.includes('system override')
	) {
		return 'guardrail_safety';
	}
	if (triggerReason === 'compaction_retention') {
		return 'compaction_retention';
	}
	if (lowerPrompt.includes('usdt') || lowerPrompt.includes('usd') || lowerPrompt.includes('crypto') || lowerPrompt.includes('dollar')) {
		return 'multi_currency';
	}
	if (lowerPrompt.includes('safe to spend') || lowerPrompt.includes('kas bebas') || lowerPrompt.includes('siap pakai') || lowerPrompt.includes('runway')) {
		return 'safe_to_spend';
	}
	if (lowerPrompt.includes('proyeksi') || lowerPrompt.includes('bulan depan') || lowerPrompt.includes('tahun depan') || lowerPrompt.includes('horizon')) {
		return 'planning_projection';
	}
	if (lowerPrompt.includes('sewa rumah') || lowerPrompt.includes('maternity') || lowerPrompt.includes('terkunci') || lowerPrompt.includes('darurat')) {
		return 'financial_sanity';
	}
	if (lowerPrompt.includes('hutang') || lowerPrompt.includes('piutang') || lowerPrompt.includes('cicilan') || lowerPrompt.includes('pinjam')) {
		return 'debt_management';
	}
	if (lowerPrompt.includes('budget') || lowerPrompt.includes('pagu') || lowerPrompt.includes('anggaran')) {
		return 'budget_tracking';
	}
	if (lowerPrompt.includes('catat') || lowerPrompt.includes('tambah pengeluaran') || lowerPrompt.includes('tambah pemasukan') || lowerPrompt.includes('mutasi')) {
		return 'transaction_record';
	}
	if (lowerPrompt.includes('kategori') || lowerPrompt.includes('pos pengeluaran') || lowerPrompt.includes('breakdown')) {
		return 'category_breakdown';
	}
	if (lowerPrompt.includes('dompet') || lowerPrompt.includes('wallet') || lowerPrompt.includes('rekening')) {
		return 'wallet_management';
	}
	if (lowerPrompt.includes('filter') || lowerPrompt.includes('cari transaksi')) {
		return 'transaction_filter';
	}
	if (lowerPrompt.includes('halaman') || lowerPrompt.includes('buka drawer') || lowerPrompt.includes('tab')) {
		return 'ui_control';
	}
	if (lowerPrompt.includes('saldo') || lowerPrompt.includes('berapa uang')) {
		return 'balance_query';
	}
	if (lowerOutput.includes('⚠️') || lowerOutput.includes('$') || triggerReason === 'code_eval_failure') {
		return 'tone_format';
	}

	return 'complex_reasoning';
}

/**
 * @walkthrough 05.07:dataset-flywheel
 * @topic Closed-Loop CI Regression Sync
 * @ref https://hamel.dev/evals/ | okf://knowledge/ai-evals-course/fase-1-fondasi-dan-stochastic-shift.md
 * @notes Men-triage kegagalan produksi (skor < 0.5 atau thumbs down) dan men-stage ke tabel eval_dataset_candidates setelah di-scrub PII.
 */
export async function stageFailedTrace(
	db: D1Database,
	job: DBEvalQueueJob,
	judgeResult: ConsolidatedJudgeOutput
): Promise<DBEvalCandidate> {
	// 1. Scrub user message and assistant output
	const sanitizedPrompt = scrubPII(job.user_message);
	const sanitizedOutput = scrubPII(job.assistant_output);

	// 2. Scrub tool results payload if present
	let sanitizedToolCallsJson: string | null = null;
	if (job.tool_results_json) {
		try {
			const parsed = JSON.parse(job.tool_results_json);
			const scrubbed = scrubPayload(parsed);
			sanitizedToolCallsJson = JSON.stringify(scrubbed);
		} catch {
			sanitizedToolCallsJson = scrubPII(job.tool_results_json);
		}
	}

	// 3. Classify domain category
	const domainCategory = classifyFailureCategory(
		job.user_message,
		job.assistant_output,
		job.trigger_reason
	);

	// 4. Identify failing rubric
	let evaluatorRubric = 'financial_soundness';
	const extendedJudge = judgeResult as ConsolidatedJudgeOutput & {
		guardrailCompliance?: { score: number };
		contextRetention?: { score: number };
	};
	if (extendedJudge.guardrailCompliance && extendedJudge.guardrailCompliance.score < 0.7) {
		evaluatorRubric = 'guardrail_compliance';
	} else if (extendedJudge.contextRetention && extendedJudge.contextRetention.score < 0.7) {
		evaluatorRubric = 'context_retention';
	} else if (judgeResult.personaTone.score < 0.7) {
		evaluatorRubric = 'persona_tone_compliance';
	} else if (judgeResult.toolTrajectory.score < 0.7) {
		evaluatorRubric = 'tool_trajectory';
	}
	// 5. Stage into D1
	return stageEvalCandidate(db, {
		sourceTraceId: job.trace_id,
		sourceSessionId: job.session_id,
		evaluatorRubric,
		domainCategory,
		sanitizedPrompt,
		sanitizedOutput,
		sanitizedToolCallsJson,
		judgeScore: judgeResult.overallScore,
		judgeReasoning: judgeResult.reasoning
	});
}
