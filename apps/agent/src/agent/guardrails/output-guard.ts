/**
 * Tier 4: In-Band Output Guardrail
 * Validates numeric grounding (with arithmetic derivation allowance)
 * and enforces currency formatting compliance and anti-slop rules.
 */

export interface OutputGroundingResult {
	grounded: boolean;
	ungroundedFigures: string[];
}

export interface OutputFormattingResult {
	compliant: boolean;
	violations: string[];
}

/**
 * Extracts distinct numerical quantities of 4+ digits from text.
 */
export function extractMonetaryQuantities(text: string): number[] {
	const matches = text.match(/\b(?:\d{1,3}(?:\.\d{3})+|\d{4,})\b/g) || [];
	const numbers: number[] = [];
	for (const m of matches) {
		const clean = Number(m.replace(/\./g, ''));
		if (!Number.isNaN(clean) && !numbers.includes(clean)) {
			// Skip standard calendar years
			if (clean >= 2020 && clean <= 2035) continue;
			numbers.push(clean);
		}
	}
	return numbers;
}

/**
 * Recursively collects all numeric values from arbitrary tool result payloads.
 */
export function extractNumbersFromPayload(payload: unknown): number[] {
	const found = new Set<number>();
	function walk(val: unknown) {
		if (typeof val === 'number' && Number.isFinite(val)) {
			found.add(val);
		} else if (typeof val === 'string') {
			const nums = extractMonetaryQuantities(val);
			nums.forEach((n) => found.add(n));
		} else if (Array.isArray(val)) {
			val.forEach(walk);
		} else if (val && typeof val === 'object') {
			Object.values(val as Record<string, unknown>).forEach(walk);
		}
	}
	walk(payload);
	return Array.from(found);
}

/**
 * Checks whether candidate number can be formed by a simple arithmetic sum or difference
 * between any two tool numbers (derivation tolerance for legitimate financial analysis).
 */
export function isArithmeticDerivation(candidate: number, baseNumbers: number[]): boolean {
	const tolerance = 1; // Rounding tolerance
	for (let i = 0; i < baseNumbers.length; i++) {
		for (let j = 0; j < baseNumbers.length; j++) {
			const sum = baseNumbers[i] + baseNumbers[j];
			const diff = Math.abs(baseNumbers[i] - baseNumbers[j]);
			if (Math.abs(candidate - sum) <= tolerance || Math.abs(candidate - diff) <= tolerance) {
				return true;
			}
		}
	}
	return false;
}

/**
 * Verifies that all 4+ digit monetary figures in assistant output are grounded in
 * user input, tool execution results, or legitimate arithmetic derivations.
 */
export function verifyOutputGrounding(
	assistantOutput: string,
	context: { userPrompt: string; toolResults: unknown[] }
): OutputGroundingResult {
	const outputNumbers = extractMonetaryQuantities(assistantOutput);
	if (outputNumbers.length === 0) {
		return { grounded: true, ungroundedFigures: [] };
	}

	const promptNumbers = extractMonetaryQuantities(context.userPrompt);
	const toolNumbers = extractNumbersFromPayload(context.toolResults);
	const basePool = [...promptNumbers, ...toolNumbers];

	const ungrounded: string[] = [];

	for (const num of outputNumbers) {
		// 1. Direct match in prompt or tools
		const isDirect = basePool.some((b) => Math.abs(b - num) <= 1);
		if (isDirect) continue;

		// 2. Arithmetic derivation check (e.g. net worth sum, balance subtraction)
		const isDerived = isArithmeticDerivation(num, basePool);
		if (isDerived) continue;

		ungrounded.push(String(num));
	}

	return {
		grounded: ungrounded.length === 0,
		ungroundedFigures: ungrounded
	};
}

/**
 * Validates currency compliance (no raw '$' in IDR responses) and absence of decorative emojis.
 */
export function verifyOutputFormatting(output: string): OutputFormattingResult {
	const violations: string[] = [];

	if (output.includes('$')) {
		violations.push("Raw dollar sign '$' detected in output");
	}

	const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
	if (emojiRegex.test(output)) {
		violations.push('Decorative Unicode emojis detected in output');
	}

	return {
		compliant: violations.length === 0,
		violations
	};
}
