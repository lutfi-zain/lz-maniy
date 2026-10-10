import { describe, it, expect } from 'vitest';
import app from '../../index.js';
import type { Env } from '../../types.js';

const mockEnv = {} as unknown as Env;

describe('CORS middleware - Allowed and Blocked Origins', () => {
	it('allows preflight OPTIONS for https://maniy.membran.app', async () => {
		const req = new Request('http://localhost/api/models', {
			method: 'OPTIONS',
			headers: {
				Origin: 'https://maniy.membran.app',
				'Access-Control-Request-Method': 'GET'
			}
		});

		const res = await app.fetch(req, mockEnv);
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://maniy.membran.app');
		expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
	});

	it('allows preflight OPTIONS for legacy https://maniyy.membran.app', async () => {
		const req = new Request('http://localhost/api/models', {
			method: 'OPTIONS',
			headers: {
				Origin: 'https://maniyy.membran.app',
				'Access-Control-Request-Method': 'GET'
			}
		});

		const res = await app.fetch(req, mockEnv);
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://maniyy.membran.app');
	});

	it('allows requests matching *.pages.dev', async () => {
		const req = new Request('http://localhost/api/models', {
			method: 'OPTIONS',
			headers: {
				Origin: 'https://preview-123.maniy.pages.dev',
				'Access-Control-Request-Method': 'GET'
			}
		});

		const res = await app.fetch(req, mockEnv);
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://preview-123.maniy.pages.dev');
	});

	it('blocks unauthorized origins', async () => {
		const req = new Request('http://localhost/api/models', {
			method: 'OPTIONS',
			headers: {
				Origin: 'https://evil-hacker.com',
				'Access-Control-Request-Method': 'GET'
			}
		});

		const res = await app.fetch(req, mockEnv);
		expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
	});
});
