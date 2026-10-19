import { describe, it, expect } from 'vitest';
import { scrubPII, scrubPayload } from '../../observability/pii-scrubber.js';

describe('4-Pass Deterministic PII Scrubber', () => {
	it('Pass 1: scrubs bearer tokens, API keys, and JWTs', () => {
		const text =
			'Auth: Bearer secret-token-xyz123 and key rd_live_9876543210abcdef and jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThis';
		const scrubbed = scrubPII(text);
		expect(scrubbed).not.toContain('secret-token-xyz123');
		expect(scrubbed).not.toContain('rd_live_9876543210abcdef');
		expect(scrubbed).not.toContain('eyJhbGciOiJIUzI1NiJ9');
		expect(scrubbed).toContain('Bearer [REDACTED_TOKEN]');
		expect(scrubbed).toContain('[REDACTED_API_KEY]');
		expect(scrubbed).toContain('[REDACTED_JWT]');
	});

	it('Pass 2: scrubs Indonesian NIK and phone numbers with formatting variations', () => {
		const text =
			'NIK 3201012345678901, HP 081234567890, kantor +62 812-9876-5432, rumah (+62) 813.1234.5678.';
		const scrubbed = scrubPII(text);
		expect(scrubbed).not.toContain('3201012345678901');
		expect(scrubbed).not.toContain('081234567890');
		expect(scrubbed).not.toContain('812-9876-5432');
		expect(scrubbed).toContain('[REDACTED_NIK]');
		expect(scrubbed).toContain('[REDACTED_PHONE]');
	});

	it('Pass 3: scrubs bank accounts contextually while preserving currency amounts and timestamps', () => {
		const text =
			'Transfer ke BCA: 883073156 atau Mandiri rek 1370012345678. Saldo Anda Rp 15.000.000, aset 1000000000, timestamp 1729324800000.';
		const scrubbed = scrubPII(text);
		// Accounts redacted
		expect(scrubbed).not.toContain('883073156');
		expect(scrubbed).not.toContain('1370012345678');
		expect(scrubbed).toContain('[REDACTED_ACCOUNT]');

		// Mathematical figures strictly preserved
		expect(scrubbed).toContain('Rp 15.000.000');
		expect(scrubbed).toContain('1000000000');
		expect(scrubbed).toContain('1729324800000');
	});

	it('Pass 4: scrubs emails and session auth user name', () => {
		const text = 'Silakan hubungi budi.santoso@example.com atau tanya langsung ke Budi Santoso.';
		const scrubbed = scrubPII(text, {
			userName: 'Budi Santoso',
			userEmail: 'budi.santoso@example.com'
		});
		expect(scrubbed).not.toContain('budi.santoso@example.com');
		expect(scrubbed).not.toContain('Budi Santoso');
		expect(scrubbed).toContain('[REDACTED_EMAIL]');
		expect(scrubbed).toContain('[USER_NAME]');
	});

	it('Recursively scrubs structured JSON payloads', () => {
		const payload = {
			user: {
				name: 'Lutfi Zain',
				phone: '087881111115',
				token: 'secret-auth-value'
			},
			transactions: [
				{
					id: 'tx-1',
					amount: 45000,
					accountNumber: 'BCA 5220304050',
					timestamp: 1729324800000
				}
			]
		};

		const scrubbed = scrubPayload(payload, { userName: 'Lutfi Zain' }) as Record<string, any>;
		expect(scrubbed.user.name).toBe('[USER_NAME]');
		expect(scrubbed.user.phone).toBe('[REDACTED_PHONE]');
		expect(scrubbed.user.token).toBe('[REDACTED_SECRET]');
		expect(scrubbed.transactions[0].amount).toBe(45000);
		expect(scrubbed.transactions[0].timestamp).toBe(1729324800000);
		expect(scrubbed.transactions[0].accountNumber).toContain('[REDACTED_ACCOUNT]');
	});
});
