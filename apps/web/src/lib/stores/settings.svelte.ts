import type { UserSettings } from '@maniyy/shared';
import { authStore } from './auth.svelte.js';
import { PUBLIC_API_URL } from '$env/static/public';

const STORAGE_KEY = 'maniyy_user_settings';

export function getDefaultActivePeriods(referenceDate = new Date()): string[] {
	const periods: string[] = [];
	const year = referenceDate.getFullYear();
	const month = referenceDate.getMonth(); // 0-indexed

	for (let i = 0; i < 3; i++) {
		const d = new Date(year, month + i, 1);
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		periods.push(`${y}-${m}`);
	}
	return periods;
}

export class SettingsStore {
	settings = $state<UserSettings>({
		ledgerViewMode: 'single',
		activePeriods: []
	});
	isLoaded = $state<boolean>(false);

	private agentBaseUrl = '';
	private token = '';
	private saveTimer: NodeJS.Timeout | number | undefined;

	constructor() {
		this.hydrateFromStorage();
	}

	private hydrateFromStorage() {
		if (typeof localStorage === 'undefined') return;
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) {
				const parsed = JSON.parse(raw) as Partial<UserSettings>;
				this.settings = {
					...this.settings,
					...parsed
				};
			}
		} catch {
			// Ignore parse error
		}
	}

	private persistToStorage() {
		if (typeof localStorage === 'undefined') return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
		} catch {
			// Ignore storage error
		}
	}

	async load(agentBaseUrl?: string, token?: string): Promise<void> {
		if (agentBaseUrl) this.agentBaseUrl = agentBaseUrl;
		if (token) this.token = token;

		if (this.agentBaseUrl) {
			const validToken = (await authStore.getValidToken(PUBLIC_API_URL)) || this.token;
			if (validToken) {
				try {
					let res = await fetch(`${this.agentBaseUrl}/api/settings`, {
						headers: {
							Authorization: `Bearer ${validToken}`
						}
					});
					if (res.status === 401 && authStore.refreshToken) {
						const refreshed = await authStore.refreshSession(PUBLIC_API_URL);
						if (refreshed && authStore.accessToken) {
							res = await fetch(`${this.agentBaseUrl}/api/settings`, {
								headers: {
									Authorization: `Bearer ${authStore.accessToken}`
								}
							});
						}
					}
					if (res.ok) {
						const data = (await res.json()) as Partial<UserSettings>;
						this.settings = {
							...this.settings,
							...data
						};
						this.persistToStorage();
					}
				} catch (err) {
					console.warn('Failed to load user settings from agent:', err);
				}
			}
		}

		// If activePeriods is empty, initialize default 3 consecutive months
		if (!this.settings.activePeriods || this.settings.activePeriods.length === 0) {
			this.settings.activePeriods = getDefaultActivePeriods();
			this.persistToStorage();
		}

		this.isLoaded = true;
	}

	save(partial: Partial<UserSettings>): Promise<void> {
		this.settings = {
			...this.settings,
			...partial
		};
		this.persistToStorage();

		if (!this.agentBaseUrl || !this.token) {
			return Promise.resolve();
		}

		clearTimeout(this.saveTimer);

		return new Promise<void>((resolve) => {
			this.saveTimer = setTimeout(async () => {
				try {
					await fetch(`${this.agentBaseUrl}/api/settings`, {
						method: 'PUT',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${this.token}`
						},
						body: JSON.stringify(partial)
					});
				} catch (err) {
					console.warn('Failed to sync user settings to agent:', err);
				} finally {
					resolve();
				}
			}, 500);
		});
	}

	addPeriod(period: string) {
		if (!this.settings.activePeriods.includes(period)) {
			const updated = [...this.settings.activePeriods, period].sort();
			this.save({ activePeriods: updated });
		}
	}

	removePeriod(period: string) {
		if (this.settings.activePeriods.length <= 1) return;
		const updated = this.settings.activePeriods.filter((p) => p !== period);
		this.save({ activePeriods: updated });
	}

	setViewMode(mode: 'single' | 'calendar_board') {
		this.save({ ledgerViewMode: mode });
	}

	reset() {
		this.settings = {
			ledgerViewMode: 'single',
			activePeriods: getDefaultActivePeriods()
		};
		this.persistToStorage();
	}
}

export const settingsStore = new SettingsStore();
