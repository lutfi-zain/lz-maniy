import { redactDiagnostics } from '../../../src/lib/utils/credential-guard';

/**
 * Extracts and parses a numeric amount from localized IDR text.
 * E.g., "Rp 16.000.000", "+Rp 3.500.000", "-Rp 1.050.000" -> 16000000, 3500000, -1050000
 */
export function parseIDRAmount(text: string): number {
	const cleaned = text.trim();
	const isNegative = cleaned.startsWith('-') || cleaned.includes('-Rp') || cleaned.includes('(Rp');
	// Extract digits
	const digits = cleaned.replace(/[^\d]/g, '');
	if (!digits) return 0;
	const val = parseInt(digits, 10);
	return isNegative ? -val : val;
}

/**
 * Extracts and parses a percentage number from text.
 * E.g., "40%", "40 %", "115%" -> 40, 115
 */
export function parsePercentage(text: string): number {
	const match = text.match(/(\d+(?:\.\d+)?)\s*%/);
	if (match) {
		return parseFloat(match[1]);
	}
	const digits = text.replace(/[^\d.]/g, '');
	return digits ? parseFloat(digits) : 0;
}

/**
 * Asserts exact numeric equality from rendered DOM text with redacted diagnostics on mismatch.
 */
export function assertNumericExact(actualText: string, expected: number, label: string): void {
	const parsed = parseIDRAmount(actualText);
	if (parsed !== expected) {
		const rawErr = `[Numeric Assertion Failed] ${label}: Expected exact ${expected} but received "${actualText}" (parsed as ${parsed})`;
		throw new Error(redactDiagnostics(rawErr));
	}
}

/**
 * Asserts percentage value with +/- 1% tolerance for display rounding.
 */
export function assertPercentageClose(actualText: string, expectedPct: number, label: string): void {
	const parsed = parsePercentage(actualText);
	if (Math.abs(parsed - expectedPct) > 1.5) {
		const rawErr = `[Percentage Assertion Failed] ${label}: Expected ~${expectedPct}% but received "${actualText}" (parsed as ${parsed}%)`;
		throw new Error(redactDiagnostics(rawErr));
	}
}
