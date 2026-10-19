
export interface EvaluationResult {
	name: string;
	score: number; // 0.0 to 1.0
	label: 'pass' | 'fail' | 'grounded' | 'hallucination_detected';
	explanation?: string;
	kind: 'CODE' | 'LLM';
}

/**
 * Extract monetary quantities (e.g. 15.000.000, 45.000, 185000) from text
 */
export function extractMonetaryNumbers(text: string): string[] {
	const matches = text.match(/\b(?:\d{1,3}(?:\.\d{3})+|\d{4,})\b/g) || [];
	return Array.from(new Set(matches));
}

/**
 * @walkthrough 05.01:eval-code-grounding
 * @topic Level 0: Deterministic Evals
 * @ref https://arize.com/docs/phoenix/evaluation/code-evaluators | okf://knowledge/ai-evals-course/fase-3-multi-tier-evaluator-dan-rubric-engineering.md
 * @notes Evaluasi kode instan ($0 token cost) untuk numeric grounding (angka harus berasal dari prompt/tool), validasi Rupiah, dan larangan emoji.
 */
export function evalNumericGrounding(
	assistantOutput: string,
	userPrompt: string,
	toolResults: unknown[]
): EvaluationResult {
	const outputNumbers = extractMonetaryNumbers(assistantOutput);
	if (outputNumbers.length === 0) {
		return { name: 'numeric_grounding', score: 1.0, label: 'grounded', kind: 'CODE' };
	}

	const searchCorpus = `${userPrompt} ${JSON.stringify(toolResults)}`;
	const ungrounded: string[] = [];

	for (const num of outputNumbers) {
		// Clean separators for normalized comparison
		const cleanNum = num.replace(/\./g, '');
		// Skip trivial short counts or year numbers like 2026
		if (cleanNum.length === 4 && (cleanNum.startsWith('202') || cleanNum.startsWith('203'))) continue;

		if (!searchCorpus.includes(num) && !searchCorpus.includes(cleanNum)) {
			ungrounded.push(num);
		}
	}

	if (ungrounded.length > 0) {
		return {
			name: 'numeric_grounding',
			score: 0.0,
			label: 'hallucination_detected',
			explanation: `Ungrounded financial figures detected: ${ungrounded.slice(0, 3).join(', ')}`,
			kind: 'CODE'
		};
	}

	return {
		name: 'numeric_grounding',
		score: 1.0,
		label: 'grounded',
		kind: 'CODE'
	};
}

/**
 * 2. Code Evaluator: Currency Governance
 * Enforces proper Indonesian Rupiah formatting and forbids raw dollar $ symbols.
 */
export function evalCurrencyGovernance(assistantOutput: string): EvaluationResult {
	const hasDollarSign = assistantOutput.includes('$');
	if (hasDollarSign) {
		return {
			name: 'currency_governance',
			score: 0.0,
			label: 'fail',
			explanation: 'Dollar symbol ($) found in IDR account output',
			kind: 'CODE'
		};
	}

	return {
		name: 'currency_governance',
		score: 1.0,
		label: 'pass',
		kind: 'CODE'
	};
}

/**
 * 3. Code Evaluator: No Emoji / Anti-Slop
 * Validates absence of decorative Unicode emojis when professional tone is required.
 */
export function evalNoEmoji(assistantOutput: string): EvaluationResult {
	const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
	const hasEmoji = emojiRegex.test(assistantOutput);

	return {
		name: 'no_emoji',
		score: hasEmoji ? 0.0 : 1.0,
		label: hasEmoji ? 'fail' : 'pass',
		explanation: hasEmoji ? 'Unsanctioned Unicode emoji detected' : undefined,
		kind: 'CODE'
	};
}

/**
 * 4. Calibrated Binary LLM / Heuristic Judge: Locked Cash Protection Guard
 * Checks whether user attempted to touch locked reserves (Sewa Rumah, Maternity, Cadangan)
 * and whether the assistant firmly protected them.
 */
export function evalLockedCashGuard(
	userPrompt: string,
	assistantOutput: string
): EvaluationResult {
	const lowerPrompt = userPrompt.toLowerCase();
	const isLockedCashAttempt =
		(lowerPrompt.includes('sewa rumah') ||
			lowerPrompt.includes('maternity') ||
			lowerPrompt.includes('pos cadangan') ||
			lowerPrompt.includes('dana darurat') ||
			lowerPrompt.includes('dompet terkunci')) &&
		(lowerPrompt.includes('pakai') ||
			lowerPrompt.includes('transfer') ||
			lowerPrompt.includes('pindahkan') ||
			lowerPrompt.includes('bayar') ||
			lowerPrompt.includes('beli'));

	if (!isLockedCashAttempt) {
		return {
			name: 'locked_cash_guard',
			score: 1.0,
			label: 'pass',
			explanation: 'No locked cash compromise attempted',
			kind: 'LLM'
		};
	}

	const lowerOutput = assistantOutput.toLowerCase();
	const protectsCash =
		lowerOutput.includes('tidak') ||
			lowerOutput.includes('terkunci') ||
			lowerOutput.includes('dilarang') ||
			lowerOutput.includes('cadangan') ||
			lowerOutput.includes('komitmen') ||
			lowerOutput.includes('sebaiknya jangan');

	return {
		name: 'locked_cash_guard',
		score: protectsCash ? 1.0 : 0.0,
		label: protectsCash ? 'pass' : 'fail',
		explanation: protectsCash
			? 'Assistant correctly defended locked reserves from consumer spending'
			: 'Assistant failed to defend locked reserves',
		kind: 'LLM'
	};
}

/**
 * Run complete multi-tier evaluation pipeline on a turn
 */
export function evaluateTurn(
	userPrompt: string,
	assistantOutput: string,
	toolResults: unknown[]
): { results: EvaluationResult[]; hasAnomaly: boolean } {
	const results: EvaluationResult[] = [
		evalNumericGrounding(assistantOutput, userPrompt, toolResults),
		evalCurrencyGovernance(assistantOutput),
		evalNoEmoji(assistantOutput),
		evalLockedCashGuard(userPrompt, assistantOutput)
	];

	const hasAnomaly = results.some((r) => r.score < 0.5);
	return { results, hasAnomaly };
}
