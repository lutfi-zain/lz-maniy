import { describe, it, expect } from 'vitest';
import {
	generateVerifier,
	generateChallenge,
	generateState,
	buildGoogleAuthorizeUrl
} from './pkce';

describe('PKCE Utilities (RFC 7636)', () => {
	it('conforms to RFC 7636 Appendix B test vector for S256 challenge generation', async () => {
		const testVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
		const expectedChallenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

		const calculatedChallenge = await generateChallenge(testVerifier);
		expect(calculatedChallenge).toBe(expectedChallenge);
	});

	it('generates a cryptographically valid code_verifier within RFC 7636 length bounds (43..128 chars)', () => {
		const verifier = generateVerifier();
		expect(verifier.length).toBeGreaterThanOrEqual(43);
		expect(verifier.length).toBeLessThanOrEqual(128);

		// Must contain only unreserved URL-safe characters: [A-Za-z0-9-_]
		expect(verifier).toMatch(/^[A-Za-z0-9\-_]+$/);
	});

	it('generates distinct random verifiers on subsequent calls', () => {
		const v1 = generateVerifier();
		const v2 = generateVerifier();
		expect(v1).not.toBe(v2);
	});

	it('generates unique anti-CSRF state tokens', () => {
		const s1 = generateState();
		const s2 = generateState();
		expect(s1.length).toBeGreaterThanOrEqual(20);
		expect(s1).toMatch(/^[A-Za-z0-9\-_]+$/);
		expect(s1).not.toBe(s2);
	});

	it('correctly builds the zero-click Google OAuth authorize URL', () => {
		const urlString = buildGoogleAuthorizeUrl({
			baseUrl: 'https://reedrich-mcp.lutfidmz.workers.dev/',
			clientId: 'maniy-web',
			redirectUri: 'https://maniy.membran.app/auth/callback',
			challenge: 'E9Melhoa2OwvFrGMTJguCH5rtx64ZnUMRo8R7Innzzs',
			state: 'test-state-xyz',
			scope: 'mcp'
		});

		const url = new URL(urlString);
		expect(url.origin).toBe('https://reedrich-mcp.lutfidmz.workers.dev');
		expect(url.pathname).toBe('/oauth/authorize');
		expect(url.searchParams.get('response_type')).toBe('code');
		expect(url.searchParams.get('client_id')).toBe('maniy-web');
		expect(url.searchParams.get('redirect_uri')).toBe('https://maniy.membran.app/auth/callback');
		expect(url.searchParams.get('code_challenge')).toBe(
			'E9Melhoa2OwvFrGMTJguCH5rtx64ZnUMRo8R7Innzzs'
		);
		expect(url.searchParams.get('code_challenge_method')).toBe('S256');
		expect(url.searchParams.get('provider')).toBe('google');
		expect(url.searchParams.get('state')).toBe('test-state-xyz');
		expect(url.searchParams.get('scope')).toBe('mcp');
	});
});
