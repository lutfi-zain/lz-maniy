export interface ScrubberContext {
	userName?: string;
	userEmail?: string;
	accountNumbers?: string[];
}

/**
 * 4-Pass Deterministic PII Scrubber
 * Scrubs credentials, NIK, phone numbers, and bank accounts while
 * strictly preserving financial quantities (e.g. Rp 1.000.000.000)
 * and Unix millisecond timestamps.
 */
export function scrubPII(text: string, context?: ScrubberContext): string {
	if (!text) return text;

	let result = text;

	// Pass 1: Secret & Credential Redaction
	// Bearer tokens
	result = result.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED_TOKEN]');
	// Known API keys
	result = result.replace(
		/\b(?:rd_live_|fp_live_|gsk_|AIza|phx_adm_sec_|sk-lf-|pk-lf-|sk-ant-|sk-proj-)[A-Za-z0-9_-]+/g,
		'[REDACTED_API_KEY]'
	);
	// Standard JWTs
	result = result.replace(
		/\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g,
		'[REDACTED_JWT]'
	);

	// Pass 2: Indonesian National ID (NIK) & Phone Numbers
	// NIK: 16 digits starting with 1-9
	result = result.replace(/\b[1-9]\d{15}\b/g, '[REDACTED_NIK]');
	// Indonesian Phone Numbers (with optional spaces, dashes, dots)
	result = result.replace(/(?:\+62[\s.-]?|62[\s.-]?|0)8[1-9][0-9\s.-]{7,12}\b/g, '[REDACTED_PHONE]');

	// Pass 3: Bank Account Numbers with Disambiguation (Preserving Monetary Math)
	// Contextual: preceded by bank names or account indicators
	result = result.replace(
		/(?<=(?:bca|mandiri|bri|bni|jago|permata|seabank|rek(?:ening)?|norek)\s*[:#.-]?\s*)\b\d{9,16}\b/gi,
		'[REDACTED_ACCOUNT]'
	);

	// Context-provided known account numbers
	if (context?.accountNumbers && context.accountNumbers.length > 0) {
		for (const acc of context.accountNumbers) {
			if (acc && acc.length >= 6) {
				const escaped = acc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
				result = result.replace(new RegExp(`\\b${escaped}\\b`, 'g'), '[REDACTED_ACCOUNT]');
			}
		}
	}

	// Generic long unformatted account numbers (10-16 digits)
	// ONLY if not preceded by currency prefixes, without dots, and not a 13-digit Unix timestamp (16/17xxx)
	result = result.replace(
		/(?<!(?:Rp\.?|IDR|\$)\s*)(?<!\.)\b(?!(?:16|17)\d{11}\b)\d{10,16}\b(?!\.)/g,
		(match) => {
			// Double-check: if it has 10 digits and looks like an integer > 1 billion without dots,
			// but lacks bank context, we redact only if it doesn't match standard currency rounding
			if (match.endsWith('000000')) {
				// Likely round billion amount (e.g. 1000000000 or 15000000000), keep as number
				return match;
			}
			return '[REDACTED_ACCOUNT]';
		}
	);

	// Pass 4: Emails & Session User Identity
	// Email addresses
	result = result.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[REDACTED_EMAIL]');

	// User Name & Email from auth context
	if (context?.userEmail) {
		const escaped = context.userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		result = result.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '[REDACTED_EMAIL]');
	}
	if (context?.userName && context.userName.trim().length >= 3) {
		const escaped = context.userName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		result = result.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '[USER_NAME]');
	}

	return result;
}

/**
 * Recursively scrub an arbitrary payload (object, array, primitive)
 */
export function scrubPayload(payload: unknown, context?: ScrubberContext): unknown {
	if (payload === null || payload === undefined) {
		return payload;
	}

	if (typeof payload === 'string') {
		return scrubPII(payload, context);
	}

	if (typeof payload === 'number' || typeof payload === 'boolean') {
		return payload;
	}

	if (Array.isArray(payload)) {
		return payload.map((item) => scrubPayload(item, context));
	}

	if (typeof payload === 'object') {
		const scrubbed: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
			// If key itself represents sensitive field, redact string value directly
			if (/^(?:password|token|secret|apiKey|authorization)$/i.test(key) && typeof value === 'string') {
				scrubbed[key] = '[REDACTED_SECRET]';
			} else {
				scrubbed[key] = scrubPayload(value, context);
			}
		}
		return scrubbed;
	}

	return payload;
}
