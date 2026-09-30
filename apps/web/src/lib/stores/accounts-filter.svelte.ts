export interface AccountsFilters {
	searchQuery: string;
	statusFilter: 'all' | 'spendable' | 'locked';
	sortBy: 'balance_desc' | 'balance_asc' | 'name' | 'last_tx';
	viewMode: 'list' | 'horizon';
	listViewStyle: 'grouped' | 'flat';
}

const DEFAULT_FILTERS: AccountsFilters = {
	searchQuery: '',
	statusFilter: 'all',
	sortBy: 'balance_desc',
	viewMode: 'list',
	listViewStyle: 'grouped'
};

class AccountsFilterStore {
	#filters = $state<AccountsFilters>({ ...DEFAULT_FILTERS });

	get filters(): Readonly<AccountsFilters> {
		return this.#filters;
	}

	get searchQuery(): string {
		return this.#filters.searchQuery;
	}

	set searchQuery(q: string) {
		this.#filters.searchQuery = q;
	}

	get statusFilter(): 'all' | 'spendable' | 'locked' {
		return this.#filters.statusFilter;
	}

	set statusFilter(s: 'all' | 'spendable' | 'locked') {
		this.#filters.statusFilter = s;
	}

	get sortBy(): 'balance_desc' | 'balance_asc' | 'name' | 'last_tx' {
		return this.#filters.sortBy;
	}

	set sortBy(sort: 'balance_desc' | 'balance_asc' | 'name' | 'last_tx') {
		this.#filters.sortBy = sort;
	}

	get viewMode(): 'list' | 'horizon' {
		return this.#filters.viewMode;
	}

	set viewMode(mode: 'list' | 'horizon') {
		this.#filters.viewMode = mode;
	}

	get listViewStyle(): 'grouped' | 'flat' {
		return this.#filters.listViewStyle;
	}

	set listViewStyle(style: 'grouped' | 'flat') {
		this.#filters.listViewStyle = style;
	}

	get hasActiveFilters(): boolean {
		return (
			this.#filters.searchQuery.trim().length > 0 ||
			this.#filters.statusFilter !== 'all' ||
			this.#filters.sortBy !== 'balance_desc'
		);
	}

	resetFilters(): void {
		this.#filters = { ...DEFAULT_FILTERS };
	}
}

export const accountsFilterStore = new AccountsFilterStore();
