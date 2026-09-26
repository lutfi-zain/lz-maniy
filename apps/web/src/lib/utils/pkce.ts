/**
 * RFC 7636 PKCE (Proof Key for Code Exchange) Utilities
 * Implemented using standard Web Crypto API (crypto.subtle & crypto.getRandomValues)
 */

/**
 * Encodes an ArrayBuffer or Uint8Array into URL-safe Base64 (base64url)
 * without padding per RFC 7636 / RFC 4648 §5
 */
export function base64UrlEncode(buffer: ArrayBuffer | Uint8Array): string {
	const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
	let binary = '';
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	const base64 = btoa(binary);
	return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Generates a cryptographically random code_verifier between 43 and 128 characters.
 * Defaults to 64 bytes of entropy (~86 base64url characters).
 */
export function generateVerifier(length = 64): string {
	const randomBytes = new Uint8Array(length);
	crypto.getRandomValues(randomBytes);
	return base64UrlEncode(randomBytes);
}

/**
 * Generates an SHA-256 code_challenge from a code_verifier (code_challenge_method = S256).
 */
export async function generateChallenge(verifier: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(verifier);
	const digest = await crypto.subtle.digest('SHA-256', data);
	return base64UrlEncode(digest);
}

/**
 * Generates a random anti-CSRF state token.
 */
export function generateState(length = 24): string {
	const randomBytes = new Uint8Array(length);
	crypto.getRandomValues(randomBytes);
	return base64UrlEncode(randomBytes);
}

export interface GoogleAuthorizeUrlParams {
	baseUrl: string;
	clientId: string;
	redirectUri: string;
	challenge: string;
	state: string;
	scope?: string;
}

/**
 * Constructs the Reedrich zero-click Google OAuth 2.0 authorization URL.
 */
export function buildGoogleAuthorizeUrl({
	baseUrl,
	clientId,
	redirectUri,
	challenge,
	state,
	scope = 'mcp'
}: GoogleAuthorizeUrlParams): string {
	const cleanBase = baseUrl.replace(/\/+$/, '');
	const url = new URL(`${cleanBase}/oauth/authorize`);
	url.searchParams.set('response_type', 'code');
	url.searchParams.set('client_id', clientId);
	url.searchParams.set('redirect_uri', redirectUri);
	url.searchParams.set('code_challenge', challenge);
	url.searchParams.set('code_challenge_method', 'S256');
	url.searchParams.set('provider', 'google');
	url.searchParams.set('scope', scope);
	url.searchParams.set('state', state);
	return url.toString();
}
