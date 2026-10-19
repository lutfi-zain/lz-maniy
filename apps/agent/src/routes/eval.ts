import { Hono } from 'hono';
import type { Env } from '../types.js';
import {
	leasePendingEvalJobs,
	updateEvalJobStatus
} from '../db/queries.js';
import { runAsyncJudge, type ConsolidatedJudgeOutput } from '../observability/async-judge.js';
import { stageFailedTrace } from '../observability/flywheel.js';
import { sendTelegramAlert } from '../observability/alerts.js';

export const evalRouter = new Hono<{ Bindings: Env }>();

/**
 * Stream score record to Langfuse Scores API
 */
async function streamJudgeScoreToLangfuse(
	env: Env,
	traceId: string,
	sessionId: string,
	name: string,
	score: number,
	comment?: string
): Promise<void> {
	if (env.LANGFUSE_ENABLED === 'false') return;
	const pub = env.LANGFUSE_PUBLIC_KEY;
	const sec = env.LANGFUSE_SECRET_KEY;
	if (!pub || !sec || !traceId) return;

	const baseUrl = (env.LANGFUSE_BASE_URL || 'https://us.cloud.langfuse.com').replace(/\/+$/, '');
	const authHeader = `Basic ${btoa(`${pub}:${sec}`)}`;

	try {
		await fetch(`${baseUrl}/api/public/scores`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: authHeader
			},
			body: JSON.stringify({
				traceId,
				name,
				value: score,
				sessionId,
				comment: comment ?? undefined,
				dataType: 'NUMERIC'
			})
		});
	} catch (err) {
		console.warn(`[EvalRouter] Failed to stream ${name} to Langfuse:`, err);
	}
}

/**
 * @walkthrough 05.02:async-llm-judge
 * @topic Level 1: Semantic CoT Judge Queue Consumer
 * @ref https://arize.com/docs/phoenix/evaluation/llm-evaluators | okf://knowledge/ai-evals-course/fase-3-multi-tier-evaluator-dan-rubric-engineering.md
 * @notes Consumer antrean D1 eval_queue dengan limit subrequest batch processing dan ekspor skor ke Langfuse dan Phoenix.
 */
export async function drainEvalQueue(
	env: Env,
	options: { batchSize?: number; priority?: 'high' | 'normal' } = {}
): Promise<{ processed: number; failed: number; stagedCandidates: number }> {
	const batchSize = Math.min(options.batchSize ?? 5, 25);
	const leased = await leasePendingEvalJobs(env.DB, batchSize, options.priority);

	if (leased.length === 0) {
		return { processed: 0, failed: 0, stagedCandidates: 0 };
	}

	let processed = 0;
	let failed = 0;
	let stagedCandidates = 0;

	for (const job of leased) {
		try {
			const judgeResult: ConsolidatedJudgeOutput = await runAsyncJudge(
				{
					userMessage: job.user_message,
					assistantOutput: job.assistant_output,
					toolResultsJson: job.tool_results_json
				},
				env
			);

			// Stream telemetry scores to Langfuse
			await Promise.allSettled([
				streamJudgeScoreToLangfuse(
					env,
					job.trace_id,
					job.session_id,
					'overall_eval',
					judgeResult.overallScore,
					judgeResult.reasoning
				),
				streamJudgeScoreToLangfuse(
					env,
					job.trace_id,
					job.session_id,
					'financial_soundness',
					judgeResult.financialSoundness.score,
					judgeResult.financialSoundness.explanation
				),
				streamJudgeScoreToLangfuse(
					env,
					job.trace_id,
					job.session_id,
					'persona_tone',
					judgeResult.personaTone.score,
					judgeResult.personaTone.explanation
				),
				streamJudgeScoreToLangfuse(
					env,
					job.trace_id,
					job.session_id,
					'tool_trajectory',
					judgeResult.toolTrajectory.score,
					judgeResult.toolTrajectory.explanation
				)
			]);

			// Check failure criteria (overallScore < 0.5 or explicit judge fail)
			if (judgeResult.overallScore < 0.5 || !judgeResult.pass) {
				failed += 1;

				// 1. Stage into flywheel dataset candidates with PII redaction
				await stageFailedTrace(env.DB, job, judgeResult);
				stagedCandidates += 1;

				// 2. Dispatch Telegram Alert
				await sendTelegramAlert(env, {
					title: 'Async Judge Failure Alert',
					sessionId: job.session_id,
					userId: job.user_id,
					userMessage: job.user_message,
					assistantOutput: job.assistant_output,
					score: judgeResult.overallScore,
					reason: judgeResult.reasoning,
					phoenixTraceId: job.trace_id
				});
			}

			// Acknowledge queue job completed
			await updateEvalJobStatus(env.DB, job.id, 'completed');
			processed += 1;
		} catch (err) {
			console.error(`[EvalRouter] Failed to process eval job ${job.id}:`, err);
			await updateEvalJobStatus(env.DB, job.id, 'failed', (err as Error)?.message || String(err));
		}
	}

	return { processed, failed, stagedCandidates };
}

/**
 * Route: POST /api/eval/drain-queue
 * Guarded by Authorization: Bearer <EVAL_ADMIN_KEY>
 */
evalRouter.post('/drain-queue', async (c) => {
	const authHeader = c.req.header('Authorization');
	const expectedKey = c.env.EVAL_ADMIN_KEY;

	if (expectedKey) {
		const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
		if (!token || token !== expectedKey) {
			return c.json({ error: 'Unauthorized: invalid EVAL_ADMIN_KEY' }, 401);
		}
	}

	const batchSizeQuery = c.req.query('batch_size');
	const priorityQuery = c.req.query('priority');

	const batchSize = batchSizeQuery ? parseInt(batchSizeQuery, 10) : 5;
	const priority = priorityQuery === 'high' || priorityQuery === 'normal' ? priorityQuery : undefined;

	const summary = await drainEvalQueue(c.env, { batchSize, priority });
	return c.json({
		success: true,
		...summary
	});
});
