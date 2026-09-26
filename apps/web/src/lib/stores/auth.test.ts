import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthStore } from './auth.svelte';

// Mock localStorage for node test environment
const mockStorage = new Map<string, string>();
const fakeLocalStorage = {
	getItem: (key: string) => mockStorage.get(key) ?? null,
	setItem: (key: string, val: string) => mockStorage.set(key, val),
	removeItem: (key: string) => mockStorage.delete(key),
	clear: () => mockStorage.clear()
};

vi.stubGlobal('localStorage', fakeLocalStorage);

describe('AuthStore Lifecycle & Session Management', () => {
	beforeEach(() => {
		mockStorage.clear();
		vi.restoreAllMocks();
	});

	it('initializes unauthenticated when storage is empty', () => {
		const store = new AuthStore();
		store.init();
		expect(store.isAuthenticated).toBe(false);
		expect(store.accessToken).toBeNull();
		expect(store.user).toBeNull();
		expect(store.isInitialized).toBe(true);
	});

	it('stores tokens and computes expiration timestamp on setSession', () => {
		const store = new AuthStore();
		const now = Date.now();
		vi.spyOn(Date, 'now').mockReturnValue(now);

		store.setSession(
			{
				access_token: 'mock-jwt-token',
				refresh_token: 'mock-refresh-token',
				expires_in: 900
			},
			{
				userId: 'usr_123',
				email: 'test@example.com',
				name: 'Test User'
			}
		);

		expect(store.isAuthenticated).toBe(true);
		expect(store.accessToken).toBe('mock-jwt-token');
		expect(store.refreshToken).toBe('mock-refresh-token');
		expect(store.expiresAt).toBe(now + 900 * 1000);
		expect(store.user?.email).toBe('test@example.com');

		// Verify persisted to localStorage
		expect(mockStorage.get('reedrich_access_token')).toBe('mock-jwt-token');
		expect(mockStorage.get('reedrich_refresh_token')).toBe('mock-refresh-token');
	});

	it('correctly calculates isExpiringSoon when within 60s of expiration', () => {
		const store = new AuthStore();
		const now = 1000000;
		vi.spyOn(Date, 'now').mockReturnValue(now);

		// Token expiring in 30 seconds (less than 60s buffer)
		store.expiresAt = now + 30 * 1000;
		expect(store.isExpiringSoon).toBe(true);

		// Token expiring in 5 minutes (more than 60s buffer)
		store.expiresAt = now + 300 * 1000;
		expect(store.isExpiringSoon).toBe(false);
	});

	it('purges all tokens and credentials on logout', () => {
		const store = new AuthStore();
		store.setSession({
			access_token: 'mock-token',
			refresh_token: 'mock-refresh'
		});

		expect(store.isAuthenticated).toBe(true);

		store.logout();

		expect(store.isAuthenticated).toBe(false);
		expect(store.accessToken).toBeNull();
		expect(store.refreshToken).toBeNull();
		expect(store.expiresAt).toBeNull();
		expect(store.user).toBeNull();

		expect(mockStorage.has('reedrich_access_token')).toBe(false);
		expect(mockStorage.has('reedrich_refresh_token')).toBe(false);
		expect(mockStorage.has('reedrich_expires_at')).toBe(false);
		expect(mockStorage.has('reedrich_user')).toBe(false);
	});

	it('handles refreshSession successfully updating token', async () => {
		const store = new AuthStore();
		store.refreshToken = 'valid-refresh-token';

		const mockResponse = {
			access_token: 'new-refreshed-jwt',
			expires_in: 900
		};

		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => mockResponse
			})
		);

		const success = await store.refreshSession('https://test.api');
		expect(success).toBe(true);
		expect(store.accessToken).toBe('new-refreshed-jwt');
	});
});
