export type DatePreset = 'this_month' | 'next_month' | 'last_month' | 'today' | 'all' | 'custom';

export interface StoredDateFilter {
	preset: DatePreset;
	startDate: string;
	endDate: string;
	lastUpdated: number;
}

const STORAGE_KEY = 'maniyy_date_filter';

function canUseStorage(): boolean {
	return typeof localStorage !== 'undefined';
}

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
		if (!canUseStorage()) {
			const def = computeMonthRange(0);
			this.startDate = def.start;
			this.endDate = def.end;
			this.isInitialized = true;
			return;
		}

		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) {
				const parsed = JSON.parse(saved) as StoredDateFilter;
				if (parsed && parsed.preset && parsed.startDate && parsed.endDate) {
					this.preset = parsed.preset;
					this.startDate = parsed.startDate;
					this.endDate = parsed.endDate;
					this.isInitialized = true;
					return;
				}
			}
		} catch (err) {
			console.warn('Failed to parse saved date filter from localStorage:', err);
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

		if (canUseStorage()) {
			try {
				const payload: StoredDateFilter = {
					preset,
					startDate: start,
					endDate: end,
					lastUpdated: Date.now()
				};
				localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
			} catch (err) {
				console.error('Failed to save date filter to localStorage:', err);
			}
		}
	}

	reset() {
		const def = computeMonthRange(0);
		this.preset = 'this_month';
		this.startDate = def.start;
		this.endDate = def.end;

		if (canUseStorage()) {
			try {
				localStorage.removeItem(STORAGE_KEY);
			} catch (err) {
				console.error('Failed to remove date filter from localStorage:', err);
			}
		}
	}
}

export const dateFilterStore = new DateFilterStore();
