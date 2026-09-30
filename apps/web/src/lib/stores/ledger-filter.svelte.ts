export interface LedgerFilters {
	walletIds: string[];
	categoryIds: string[];
	budgetIds: string[];
	budgetFilterName: string;
	type: 'all' | 'expense' | 'income' | 'transfer';
	status: 'all' | 'realized' | 'planned';
	searchKeyword: string;
	currentPage: number;
	pageSize: number;
}

const DEFAULT_FILTERS: LedgerFilters = {
	walletIds: [],
	categoryIds: [],
	budgetIds: [],
	budgetFilterName: '',
	type: 'all',
	status: 'all',
	searchKeyword: '',
	currentPage: 1,
	pageSize: 50
};

class LedgerFilterStore {
	#filters = $state<LedgerFilters>({ ...DEFAULT_FILTERS });

	get filters(): Readonly<LedgerFilters> {
		return this.#filters;
	}

	get walletIds(): string[] {
		return this.#filters.walletIds;
	}

	set walletIds(ids: string[]) {
		this.#filters.walletIds = ids;
		this.#filters.currentPage = 1;
	}

	get categoryIds(): string[] {
		return this.#filters.categoryIds;
	}

	set categoryIds(ids: string[]) {
		this.#filters.categoryIds = ids;
		this.#filters.currentPage = 1;
	}

	get budgetIds(): string[] {
		return this.#filters.budgetIds;
	}

	set budgetIds(ids: string[]) {
		this.#filters.budgetIds = ids;
		this.#filters.currentPage = 1;
	}

	get budgetFilterName(): string {
		return this.#filters.budgetFilterName;
	}

	set budgetFilterName(name: string) {
		this.#filters.budgetFilterName = name;
	}

	get type(): 'all' | 'expense' | 'income' | 'transfer' {
		return this.#filters.type;
	}

	set type(t: 'all' | 'expense' | 'income' | 'transfer') {
		this.#filters.type = t;
		this.#filters.currentPage = 1;
	}

	get status(): 'all' | 'realized' | 'planned' {
		return this.#filters.status;
	}

	set status(s: 'all' | 'realized' | 'planned') {
		this.#filters.status = s;
		this.#filters.currentPage = 1;
	}

	get searchKeyword(): string {
		return this.#filters.searchKeyword;
	}

	set searchKeyword(k: string) {
		this.#filters.searchKeyword = k;
		this.#filters.currentPage = 1;
	}

	get currentPage(): number {
		return this.#filters.currentPage;
	}

	set currentPage(p: number) {
		this.#filters.currentPage = p;
	}

	get pageSize(): number {
		return this.#filters.pageSize;
	}

	set pageSize(size: number) {
		this.#filters.pageSize = size;
		this.#filters.currentPage = 1;
	}

	get hasActiveFilters(): boolean {
		return (
			this.#filters.walletIds.length > 0 ||
			this.#filters.categoryIds.length > 0 ||
			this.#filters.budgetIds.length > 0 ||
			this.#filters.type !== 'all' ||
			this.#filters.status !== 'all' ||
			this.#filters.searchKeyword.trim().length > 0
		);
	}

	setBudgetFilter(id: string, name?: string): void {
		this.#filters.budgetIds = id ? [id] : [];
		this.#filters.budgetFilterName = name || '';
		this.#filters.currentPage = 1;
	}

	clearBudgetFilter(): void {
		this.#filters.budgetIds = [];
		this.#filters.budgetFilterName = '';
		this.#filters.currentPage = 1;
	}

	resetFilters(): void {
		this.#filters = { ...DEFAULT_FILTERS };
	}
}

export const ledgerFilterStore = new LedgerFilterStore();
