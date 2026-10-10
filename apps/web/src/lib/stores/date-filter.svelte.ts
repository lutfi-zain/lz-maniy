export type DatePreset = 'this_month' | 'next_month' | 'last_month' | 'today' | 'all' | 'custom';

export interface StoredDateFilter {
	preset: DatePreset;
	startDate: string;
	endDate: string;
	lastUpdated: number;
}
import { getStoredValue, setStoredValue, removeStoredValue } from '$lib/utils/storage';

const MODERN_STORAGE_KEY = 'maniy_date_filter';
const LEGACY_STORAGE_KEY = 'maniyy_date_filter';

function computeMonthRange(offsetMonths = 0): { start: string; end: string } {
	const now = new Date();
	const y = now.getFullYear();
	const m = now.getMonth() + offsetMonths;
	const s = new Date(y, m, 1);
	const e = new Date(y, m + 1, 0);

	const fmt = (d: Date) => {
		const year = d.getFullYear();
		const month = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	};

	return { start: fmt(s), end: fmt(e) };
}

export class DateFilterStore {
	isInitialized = $state<boolean>(false);
	preset = $state<DatePreset>('this_month');
	startDate = $state<string>('');
	endDate = $state<string>('');

	constructor() {
		this.init();
	}

	init() {
		const saved = getStoredValue<StoredDateFilter | null>(MODERN_STORAGE_KEY, LEGACY_STORAGE_KEY, null);
		if (saved && saved.preset && saved.startDate && saved.endDate) {
			this.preset = saved.preset;
			this.startDate = saved.startDate;
			this.endDate = saved.endDate;
			this.isInitialized = true;
			return;
		}

		// Default fallback: this_month
		const def = computeMonthRange(0);
		this.preset = 'this_month';
		this.startDate = def.start;
		this.endDate = def.end;
		this.isInitialized = true;
	}

	setFilter(preset: DatePreset, start: string, end: string) {
		this.preset = preset;
		this.startDate = start;
		this.endDate = end;

		const payload: StoredDateFilter = {
			preset,
			startDate: start,
			endDate: end,
			lastUpdated: Date.now()
		};
		setStoredValue(MODERN_STORAGE_KEY, payload);
	}

	reset() {
		const def = computeMonthRange(0);
		this.preset = 'this_month';
		this.startDate = def.start;
		this.endDate = def.end;

		removeStoredValue(MODERN_STORAGE_KEY, LEGACY_STORAGE_KEY);
	}
}

export const dateFilterStore = new DateFilterStore();
