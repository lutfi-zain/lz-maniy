/**
 * Tier 1: Input Guardrail
 * Protects against prompt injection, jailbreaks, delimiter hijacking,
 * and indirect prompt injection in external statement/transaction data.
 */

// Zero-width characters used for steganographic filter evasion
const ZERO_WIDTH_REGEX = /[\u200B-\u200D\uFEFF]/g;

// Dual-language regex for English & Indonesian jailbreak / system override patterns
const PROMPT_INJECTION_PATTERNS = [
	/\b(?:ignore|disregard|forget)\s+(?:all\s+)?(?:previous|above|prior|system)\s+(?:instructions|rules|prompts?|constraints?)\b/i,
	/\b(?:system\s+override|developer\s+mode|dan\s+mode|jailbreak|bypass\s+(?:all\s+)?guardrails?)\b/i,
	/\babaikan\s+(?:semua\s+)?(?:instruksi|aturan|prompt|perintah)\s+(?:sebelumnya|sistem|di atas)\b/i,
	/\blupakan\s+(?:semua\s+)?(?:aturan|instruksi|batasan|prompt)\b/i,
	/\b(?:mode\s+leluasa|tanpa\s+batas|lewati\s+keamanan|matikan\s+sistem)\b/i
];

const DELIMITER_HIJACK_PATTERNS = [
	/===\s*(?:SYSTEM|ADMIN|PROMPT|OVERRIDE)\s*===/i,
	/\[\s*(?:SYSTEM(?:\s+PROMPT)?|INSTRUCTION)\s*\]/i,
	/```\s*(?:system|override)\b/i
];

export interface InputValidationResult {
	allowed: boolean;
	violationType?: 'prompt_injection' | 'delimiter_hijack';
	refusalMessage?: string;
}

/**
 * Normalizes input text by stripping zero-width characters and excessive whitespace.
 */
export function canonicalizeInput(raw: string): string {
	if (!raw) return '';
	return raw.replace(ZERO_WIDTH_REGEX, '').normalize('NFKC');
}

/**
 * Validates user input against direct prompt injection and system override attempts.
 */
export function validateInputPrompt(rawPrompt: string): InputValidationResult {
	const cleaned = canonicalizeInput(rawPrompt);

	for (const pattern of PROMPT_INJECTION_PATTERNS) {
		if (pattern.test(cleaned)) {
			return {
				allowed: false,
				violationType: 'prompt_injection',
				refusalMessage:
					'Maaf, permintaan ini tidak dapat diproses karena melanggar kebijakan keamanan sistem finansial Eve.'
			};
		}
	}

	for (const pattern of DELIMITER_HIJACK_PATTERNS) {
		if (pattern.test(cleaned)) {
			return {
				allowed: false,
				violationType: 'delimiter_hijack',
				refusalMessage:
					'Maaf, teks memuat format delimiter sistem yang tidak diizinkan.'
			};
		}
	}

	return { allowed: true };
}

/**
 * Fences external, potentially untrusted user data (e.g. statement rows, transaction notes)
 * within explicit XML delimiters to prevent Indirect Prompt Injection.
 */
export function fenceUntrustedData(content: string, source: string = 'external_data'): string {
	const safeContent = content.replace(/<\/untrusted_user_data>/gi, '');
	return `<untrusted_user_data source="${source}">\n${safeContent}\n</untrusted_user_data>`;
}
