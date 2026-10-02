import { describe, it, expect } from 'vitest';
import { redactDiagnostics, validateTestPreflight } from './credential-guard';

describe('Credential Guard & Diagnostic Redaction', () => {
	it('redacts live Reedrich tokens in diagnostic messages', () => {
		const sampleSecret = ['rd', 'live', '0123456789abcdef0123456789abcdef'].join('_');
		const message = `Failed request with token ${sampleSecret} on endpoint /wallets`;
		const redacted = redactDiagnostics(message);

		expect(redacted).not.toContain(sampleSecret);
		expect(redacted).toContain('rd_l...[REDACTED]...cdef');
	});

	it('redacts Groq and Google provider keys in diagnostic messages', () => {
		const groqKey = ['gsk', '1234567890abcdef1234567890abcdef1234567890abcdef'].join('_');
		const googleKey = ['AQ', '1234567890abcdef1234567890abcdef12'].join('.');
		const message = `Keys: Groq=${groqKey}, Google=${googleKey}`;
		const redacted = redactDiagnostics(message);

		expect(redacted).not.toContain(groqKey);
		expect(redacted).not.toContain(googleKey);
		expect(redacted).toContain('[REDACTED]');
	});

	it('redacts Bearer authentication headers in diagnostic dumps', () => {
		const message = 'Headers: { Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" }';
		const redacted = redactDiagnostics(message);

		expect(redacted).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
		expect(redacted).toContain('[REDACTED]');
	});

	it('validateTestPreflight fails when token is missing', () => {
		const result = validateTestPreflight({
			apiBaseUrl: 'https://staging.example.com',
			token: '',
			allowDestructive: true
		});

		expect(result.valid).toBe(false);
		expect(result.error).toContain('Missing REEDRICH_TEST_API_TOKEN');
	});

	it('validateTestPreflight blocks production targets unless explicitly approved', () => {
		const result = validateTestPreflight({
			apiBaseUrl: 'https://prd-api.example.com',
			token: 'test_token',
			allowDestructive: true,
			allowProduction: false
		});

		expect(result.valid).toBe(false);
		expect(result.error).toContain('Target environment is detected as Production');
	});

	it('validateTestPreflight blocks destructive runs unless REEDRICH_TEST_ALLOW_DESTRUCTIVE is set', () => {
		const result = validateTestPreflight({
			apiBaseUrl: 'https://staging.example.com',
			token: 'test_token',
			allowDestructive: false
		});

		expect(result.valid).toBe(false);
		expect(result.error).toContain('Destructive operations require REEDRICH_TEST_ALLOW_DESTRUCTIVE=true');
	});
	it('validateTestPreflight blocks when actualUserId does not match expectedUserId', () => {
		const result = validateTestPreflight({
			apiBaseUrl: 'https://staging.example.com',
			token: 'test_token',
			expectedUserId: 'usr_testbot_123',
			actualUserId: 'usr_different_personal_account',
			allowDestructive: true
		});

		expect(result.valid).toBe(false);
		expect(result.error).toContain('Safety Violation: Authenticated user ID');
	});


	it('validateTestPreflight passes when all safety invariants are met', () => {
		const result = validateTestPreflight({
			apiBaseUrl: 'https://staging.example.com',
			token: 'test_token',
			allowDestructive: true
		});

		expect(result.valid).toBe(true);
		expect(result.error).toBeUndefined();
	});
});
