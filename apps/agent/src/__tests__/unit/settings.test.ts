import { describe, it, expect } from 'vitest';
import {
	getUserSettings,
	upsertUserSettings,
	DEFAULT_USER_SETTINGS
} from '../../db/queries.js';

function createMockSettingsD1() {
	const userSettingsStore = new Map<string, { user_id: string; settings_json: string; updated_at: number }>();

	return {
		store: userSettingsStore,
		prepare(sql: string) {
			let boundArgs: unknown[] = [];
			return {
				bind(...args: unknown[]) {
					boundArgs = args;
					return this;
				},
				async run() {
					if (sql.includes('INSERT INTO user_settings')) {
						const [user_id, settings_json, updated_at] = boundArgs as [string, string, number];
						userSettingsStore.set(user_id, { user_id, settings_json, updated_at });
						return { meta: { changes: 1 } };
					}
					return { meta: { changes: 0 } };
				},
				async first<T>() {
					if (sql.includes('SELECT settings_json FROM user_settings WHERE user_id = ?')) {
						const [user_id] = boundArgs as [string];
						const row = userSettingsStore.get(user_id);
						if (!row) return null;
						return { settings_json: row.settings_json } as unknown as T;
					}
					return null;
				}
			};
		}
	} as unknown as D1Database;
}

describe('Settings DB Queries', () => {
	it('returns default settings when user has no stored settings', async () => {
		const db = createMockSettingsD1();
		const settings = await getUserSettings(db, 'user-1');

		expect(settings).toEqual(DEFAULT_USER_SETTINGS);
		expect(settings.ledgerViewMode).toBe('single');
		expect(settings.activePeriods).toEqual([]);
	});

	it('upserts and retrieves user settings', async () => {
		const db = createMockSettingsD1();
		const saved = await upsertUserSettings(db, 'user-1', {
			ledgerViewMode: 'calendar_board',
			activePeriods: ['2026-10', '2026-11', '2026-12']
		});

		expect(saved.ledgerViewMode).toBe('calendar_board');
		expect(saved.activePeriods).toEqual(['2026-10', '2026-11', '2026-12']);

		const retrieved = await getUserSettings(db, 'user-1');
		expect(retrieved.ledgerViewMode).toBe('calendar_board');
		expect(retrieved.activePeriods).toEqual(['2026-10', '2026-11', '2026-12']);
	});

	it('merges partial updates without overwriting existing fields', async () => {
		const db = createMockSettingsD1();
		await upsertUserSettings(db, 'user-1', {
			ledgerViewMode: 'calendar_board',
			activePeriods: ['2026-10', '2026-11']
		});

		// Update only activePeriods
		const updated = await upsertUserSettings(db, 'user-1', {
			activePeriods: ['2026-10', '2026-11', '2026-12', '2027-01']
		});

		expect(updated.ledgerViewMode).toBe('calendar_board');
		expect(updated.activePeriods).toHaveLength(4);

		const retrieved = await getUserSettings(db, 'user-1');
		expect(retrieved.ledgerViewMode).toBe('calendar_board');
		expect(retrieved.activePeriods).toEqual(['2026-10', '2026-11', '2026-12', '2027-01']);
	});

	it('gracefully falls back to defaults on corrupt JSON in database', async () => {
		const mock = createMockSettingsD1();
		(mock as unknown as { store: Map<string, unknown> }).store.set('user-corrupt', {
			user_id: 'user-corrupt',
			settings_json: '{ bad json',
			updated_at: Date.now()
		});

		const settings = await getUserSettings(mock, 'user-corrupt');
		expect(settings).toEqual(DEFAULT_USER_SETTINGS);
	});
});
