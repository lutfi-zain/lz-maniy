import { DEFAULT_API_URL } from '$lib/stores/mock-data';

export interface UserProfile {
	userId?: string;
	email?: string;
	name?: string;
	firstName?: string;
	lastName?: string;
	fullName?: string;
	whatsappNumber?: string;
	createdAt?: string;
	avatar?: string;
}

export interface TokenResponse {
	access_token: string;
	refresh_token?: string;
	token_type?: string;
	expires_in?: number;
	scope?: string;
}

const STORAGE_KEYS = {
	ACCESS_TOKEN: 'reedrich_access_token',
	REFRESH_TOKEN: 'reedrich_refresh_token',
	EXPIRES_AT: 'reedrich_expires_at',
	USER: 'reedrich_user'
} as const;

function canUseStorage(): boolean {
	return typeof localStorage !== 'undefined';
}

export class AuthStore {
	isInitialized = $state<boolean>(false);
	accessToken = $state<string | null>(null);
	refreshToken = $state<string | null>(null);
	expiresAt = $state<number | null>(null);
	user = $state<UserProfile | null>(null);

	// Derived state
	isAuthenticated = $derived<boolean>(Boolean(this.accessToken));
	isExpiringSoon = $derived<boolean>(
		Boolean(this.expiresAt && Date.now() > this.expiresAt - 60_000)
	);
	isExpired = $derived<boolean>(
		Boolean(this.expiresAt && Date.now() >= this.expiresAt)
	);

	private refreshPromise: Promise<boolean> | null = null;

	constructor() {
		if (canUseStorage()) {
			this.init();
		}
	}

	/**
	 * Synchronously hydrate credentials from localStorage on browser mount.
	 */
	init() {
		if (!canUseStorage()) {
			this.isInitialized = true;
			return;
		}

		try {
			const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
			const refresh = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
			const exp = localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);
			const userStr = localStorage.getItem(STORAGE_KEYS.USER);

			this.accessToken = token;
			this.refreshToken = refresh;
			this.expiresAt = exp ? parseInt(exp, 10) : null;
			this.user = userStr ? JSON.parse(userStr) : null;

			// If user object not stored yet but access token is JWT, extract claims
			if (this.accessToken && !this.user) {
				this.extractJwtClaims(this.accessToken);
			}
		} catch (err) {
			console.error('Failed to load auth credentials from localStorage:', err);
		} finally {
			this.isInitialized = true;
		}
	}

	/**
	 * Establish or update authenticated session with issued tokens.
	 */
	setSession(tokenData: TokenResponse, profile?: UserProfile) {
		this.accessToken = tokenData.access_token;
		if (tokenData.refresh_token) {
			this.refreshToken = tokenData.refresh_token;
		}
		const expiresIn = tokenData.expires_in ?? 900;
		this.expiresAt = Date.now() + expiresIn * 1000;

		if (profile) {
			this.user = profile;
		} else if (this.accessToken) {
			this.extractJwtClaims(this.accessToken);
		}

		if (canUseStorage()) {
			try {
				localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, this.accessToken);
				if (this.refreshToken) {
					localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, this.refreshToken);
				}
				localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, String(this.expiresAt));
				if (this.user) {
					localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(this.user));
				}
			} catch (err) {
				console.error('Failed to write auth credentials to localStorage:', err);
			}
		}
	}
	/**
	 * Update user profile details and synchronize with localStorage.
	 */
	setUserProfile(profile: UserProfile) {
		const displayName =
			profile.fullName ||
			profile.name ||
			`${profile.firstName || ''} ${profile.lastName || ''}`.trim() ||
			this.user?.name ||
			'User';

		this.user = {
			...this.user,
			...profile,
			name: displayName
		};

		if (canUseStorage()) {
			try {
				localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(this.user));
			} catch (err) {
				console.error('Failed to update user profile in localStorage:', err);
			}
		}
	}

	/**
	 * Returns a guaranteed valid access token, auto-refreshing if expired or expiring soon.
	 */
	async getValidToken(baseUrl = DEFAULT_API_URL): Promise<string | null> {
		if (!this.accessToken) return null;
		if ((this.isExpired || this.isExpiringSoon) && this.refreshToken) {
			const refreshed = await this.refreshSession(baseUrl);
			if (!refreshed) return null;
		}
		return this.accessToken;
	}

	/**
	 * Performs token refresh using refresh_token against /oauth/token.
	 * Mutex-locked so concurrent requests await the same promise.
	 */
	async refreshSession(baseUrl = DEFAULT_API_URL): Promise<boolean> {
		if (!this.refreshToken) {
			return false;
		}

		if (this.refreshPromise) {
			return this.refreshPromise;
		}

		this.refreshPromise = (async () => {
			try {
				const cleanBase = baseUrl.replace(/\/+$/, '');
				const res = await fetch(`${cleanBase}/oauth/token`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						grant_type: 'refresh_token',
						client_id: 'maniy-web',
						refresh_token: this.refreshToken
					})
				});

				if (!res.ok) {
					this.logout();
					return false;
				}

				const data = (await res.json()) as TokenResponse;
				if (data.access_token) {
					this.setSession(data);
					return true;
				}
				return false;
			} catch (err) {
				console.error('Failed to refresh OAuth token:', err);
				return false;
			} finally {
				this.refreshPromise = null;
			}
		})();

		return this.refreshPromise;
	}

	/**
	 * Terminate session and remove all credentials from storage.
	 */
	logout() {
		this.accessToken = null;
		this.refreshToken = null;
		this.expiresAt = null;
		this.user = null;

		if (canUseStorage()) {
			try {
				localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
				localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
				localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);
				localStorage.removeItem(STORAGE_KEYS.USER);
			} catch (err) {
				console.error('Failed to purge auth credentials from localStorage:', err);
			}
		}
	}

	private extractJwtClaims(token: string) {
		try {
			const parts = token.split('.');
			if (parts.length === 3) {
				const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
				const payloadStr = atob(payloadBase64);
				const payload = JSON.parse(payloadStr) as { sub?: string; email?: string; name?: string };
				this.user = {
					userId: payload.sub,
					email: payload.email,
					name: payload.name || payload.email?.split('@')[0] || 'User'
				};
			}
		} catch {
			// Non-critical claim extraction fallback
		}
	}
}

export const authStore = new AuthStore();
