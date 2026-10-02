/**
 * Security & Credential Hygiene Guard Utilities
 * Ensures runtime validation of test credentials, target safety, and diagnostic redaction.
 */

const SECRET_REDACTION_PATTERNS = [
	/(?:rd|fp)_live_[A-Fa-f0-9]{32}(?![A-Fa-f0-9])/g,
	/gsk_[A-Za-z0-9_\-]{40,}/g,
	/(?:AIza[0-9A-Za-z_\-]{35}|AQ\.[A-Za-z0-9_\-]{30,})/g,
	/Bearer\s+[A-Za-z0-9._\-]+/gi
];

/**
 * Redacts any embedded credential or bearer token in error messages, payloads, or logs.
 */
export function redactDiagnostics(text: string): string {
	if (!text) return '';
	let result = text;
	for (const pattern of SECRET_REDACTION_PATTERNS) {
		result = result.replace(pattern, (match) => {
			if (match.length <= 8) return '[REDACTED]';
			return `${match.slice(0, 4)}...[REDACTED]...${match.slice(-4)}`;
		});
	}
	return result;
}

export interface TargetGuardOptions {
	apiBaseUrl?: string;
	token?: string;
	expectedUserId?: string;
	actualUserId?: string;
	allowDestructive?: boolean;
	allowProduction?: boolean;
}

export interface GuardCheckResult {
	valid: boolean;
	error?: string;
}

/**
 * Validates preflight conditions before any test execution or mutation.
 */
export function validateTestPreflight(options: TargetGuardOptions): GuardCheckResult {
	const { apiBaseUrl, token, allowDestructive, allowProduction } = options;

	if (!token) {
		return {
			valid: false,
			error: 'Preflight Error: Missing REEDRICH_TEST_API_TOKEN environment variable.'
		};
	}

	const url = (apiBaseUrl || '').toLowerCase();
	const isProd =
		url.includes('prd-') ||
		url.includes('production') ||
		url.includes('preproduction') ||
		url.includes('prod.');

	if (isProd && !allowProduction) {
		return {
			valid: false,
			error:
				'Safety Guard: Target environment is detected as Production, but REEDRICH_TEST_ALLOW_PRODUCTION is not explicitly set.'
		};
	}

	if (options.expectedUserId && options.actualUserId && options.actualUserId !== options.expectedUserId) {
		return {
			valid: false,
			error: `Safety Violation: Authenticated user ID (${options.actualUserId}) does not match expected test account ID (${options.expectedUserId}).`
		};
	}

	if (!allowDestructive) {
		return {
			valid: false,
			error:
				'Safety Guard: Destructive operations require REEDRICH_TEST_ALLOW_DESTRUCTIVE=true.'
		};
	}

	return { valid: true };
}
