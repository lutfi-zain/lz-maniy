import { z } from 'zod';
import type { Env } from '../types.js';

export const ConsolidatedJudgeOutputSchema = z.object({
	evaluator: z.literal('consolidated_judge'),
	overallScore: z.number().min(0).max(1),
	pass: z.boolean(),
	reasoning: z.string(),
	financialSoundness: z.object({
		score: z.number().min(0).max(1),
		lockedCashDefended: z.boolean(),
		deficitHandled: z.boolean(),
		arithmeticConsistent: z.boolean(),
		isApplicable: z.boolean(),
		explanation: z.string().optional()
	}),
	personaTone: z.object({
		score: z.number().min(0).max(1),
		zeroEmojis: z.boolean(),
		currencyCompliant: z.boolean(),
		explanation: z.string().optional()
	}),
	toolTrajectory: z.object({
		score: z.number().min(0).max(1),
		toolSelectionAccurate: z.boolean(),
		redundantCallsAvoided: z.boolean(),
		explanation: z.string().optional()
	})
});

export type ConsolidatedJudgeOutput = z.infer<typeof ConsolidatedJudgeOutputSchema>;

export interface AsyncJudgeTurnInput {
	userMessage: string;
	assistantOutput: string;
	toolResultsJson?: string | null;
}

export function buildJudgePrompt(input: AsyncJudgeTurnInput): string {
	return `You are an automated enterprise evaluation judge for the Maniyy Financial Intelligence Agent (Eve).
Evaluate the following assistant response across 3 core rubrics using Chain-of-Thought reasoning.

### Evaluated Turn
[USER MESSAGE]:
${input.userMessage}

[ASSISTANT RESPONSE]:
${input.assistantOutput}

[TOOL RESULTS PAYLOAD]:
${input.toolResultsJson || 'None'}

---

### Evaluation Rubrics

1. **Financial Soundness (0.0 to 1.0)**:
   - Locked Cash Defense: If the user requests or hints at spending, borrowing from, or liquidating locked emergency reserves (e.g. Sewa Rumah, Maternity, Cadangan, Pajak), the assistant MUST strictly defend them and refuse or warn against unauthorized usage.
   - Deficit Safe-to-Spend: If spendable cash is lower than near-term planned allocations/commitments, the assistant MUST issue a deficit alert and advise against non-essential spending.
   - Mathematical Consistency: Forward projections and calculations must be logically sound based on user data and tool outputs.
   - If this turn is purely non-financial (e.g. navigation or greeting), mark isApplicable = false and score = 1.0.

2. **Persona & Tone Governance (0.0 to 1.0)**:
   - Zero Emojis: Conversational emojis (e.g. ⚠️, 👉, 📌, 👍, 🙏, 😊, etc.) are STRICTLY PROHIBITED in the Eve persona.
   - Currency Formatting: Base currency IDR must be formatted as "Rp X.XXX.XXX" with dots. Raw dollar signs ("$") are STRICTLY FORBIDDEN.
   - Multi-Currency Exception: Legitimate non-dollar crypto/foreign currencies (e.g. USDT, EUR, SGD) referenced in user context are PERMITTED and must NOT be penalized.

3. **Tool Trajectory & Efficiency (0.0 to 1.0)**:
   - Tool Selection: The assistant must call appropriate tools to resolve user financial queries without hallucinating missing records.
   - Efficiency: Redundant queries or infinite tool retry loops must not occur.

---

### Required Output Format
Respond ONLY with a valid JSON object matching this schema without markdown code blocks:
{
  "evaluator": "consolidated_judge",
  "overallScore": number (0.0 to 1.0),
  "pass": boolean (true if overallScore >= 0.7),
  "reasoning": string (concise step-by-step justification),
  "financialSoundness": {
    "score": number,
    "lockedCashDefended": boolean,
    "deficitHandled": boolean,
    "arithmeticConsistent": boolean,
    "isApplicable": boolean,
    "explanation": string
  },
  "personaTone": {
    "score": number,
    "zeroEmojis": boolean,
    "currencyCompliant": boolean,
    "explanation": string
  },
  "toolTrajectory": {
    "score": number,
    "toolSelectionAccurate": boolean,
    "redundantCallsAvoided": boolean,
    "explanation": string
  }
}`;
}

export function parseJudgeResponse(rawText: string): ConsolidatedJudgeOutput {
	const cleaned = rawText
		.replace(/^```(?:json)?\s*/i, '')
		.replace(/\s*```$/, '')
		.trim();

	const parsed = JSON.parse(cleaned);
	return ConsolidatedJudgeOutputSchema.parse(parsed);
}

/**
 * @walkthrough 05.02:async-llm-judge
 * @topic Level 1: Semantic CoT Judge
 * @ref https://arize.com/docs/phoenix/evaluation/llm-evaluators | okf://knowledge/ai-evals-course/fase-3-multi-tier-evaluator-dan-rubric-engineering.md
 * @notes Evaluasi semantik model-graded (Financial Soundness & Persona) menggunakan Gemini 3.8 Flash temp 0.0 out-of-band via D1 queue dan cron worker.
 */
export async function runAsyncJudge(
	input: AsyncJudgeTurnInput,
	env: Env,
	fetchFn: typeof fetch = fetch
): Promise<ConsolidatedJudgeOutput> {
	const gatewayUrl = (env.OMP_GATEWAY_URL || 'https://ai.membran.app/v1').replace(/\/+$/, '');
	const apiKey = env.OMP_GATEWAY_KEY || env.GEMINI_API_KEY || '';

	const prompt = buildJudgePrompt(input);

	try {
		const response = await fetchFn(`${gatewayUrl}/chat/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
			},
			body: JSON.stringify({
				model: 'google-antigravity/gemini-3.8-flash',
				messages: [
					{
						role: 'system',
						content:
							'You are an expert AI evaluator. Always respond strictly in valid JSON without backticks or markdown formatting.'
					},
					{
						role: 'user',
						content: prompt
					}
				],
				temperature: 0.0
			})
		});

		if (!response.ok) {
			const errBody = await response.text();
			throw new Error(`OMP AI Gateway HTTP ${response.status}: ${errBody}`);
		}

		const data = (await response.json()) as {
			choices?: Array<{ message?: { content?: string } }>;
		};
		const content = data.choices?.[0]?.message?.content || '';
		return parseJudgeResponse(content);
	} catch (err) {
		console.warn('[AsyncJudge] Evaluation failed, generating fallback audit:', err);
		// Graceful fallback audit to prevent queue stalls
		return {
			evaluator: 'consolidated_judge',
			overallScore: 0.0,
			pass: false,
			reasoning: `Judge invocation error: ${(err as Error)?.message || String(err)}`,
			financialSoundness: {
				score: 0.0,
				lockedCashDefended: false,
				deficitHandled: false,
				arithmeticConsistent: false,
				isApplicable: true,
				explanation: 'Evaluator gateway unreachable'
			},
			personaTone: {
				score: 0.0,
				zeroEmojis: false,
				currencyCompliant: false,
				explanation: 'Evaluator gateway unreachable'
			},
			toolTrajectory: {
				score: 0.0,
				toolSelectionAccurate: false,
				redundantCallsAvoided: false,
				explanation: 'Evaluator gateway unreachable'
			}
		};
	}
}
