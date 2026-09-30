export interface PlanningFilters {
	activeSubTab: 'budgets' | 'goals' | 'obligations' | 'categories';
	goalFilter: 'all' | 'in_progress' | 'overdue' | 'completed';
	budgetFilter: 'active' | 'past' | 'all';
	goalsViewMode: 'list' | 'horizon';
}

const DEFAULT_FILTERS: PlanningFilters = {
	activeSubTab: 'goals',
	goalFilter: 'all',
	budgetFilter: 'active',
	goalsViewMode: 'list'
};

class PlanningFilterStore {
	#filters = $state<PlanningFilters>({ ...DEFAULT_FILTERS });

	get filters(): Readonly<PlanningFilters> {
		return this.#filters;
	}

	get activeSubTab(): 'budgets' | 'goals' | 'obligations' | 'categories' {
		return this.#filters.activeSubTab;
	}

	set activeSubTab(tab: 'budgets' | 'goals' | 'obligations' | 'categories') {
		this.#filters.activeSubTab = tab;
	}

	get goalFilter(): 'all' | 'in_progress' | 'overdue' | 'completed' {
		return this.#filters.goalFilter;
	}

	set goalFilter(f: 'all' | 'in_progress' | 'overdue' | 'completed') {
		this.#filters.goalFilter = f;
	}

	get budgetFilter(): 'active' | 'past' | 'all' {
		return this.#filters.budgetFilter;
	}

	set budgetFilter(b: 'active' | 'past' | 'all') {
		this.#filters.budgetFilter = b;
	}

	get goalsViewMode(): 'list' | 'horizon' {
		return this.#filters.goalsViewMode;
	}

	set goalsViewMode(mode: 'list' | 'horizon') {
		this.#filters.goalsViewMode = mode;
	}

	resetFilters(): void {
		this.#filters = { ...DEFAULT_FILTERS };
	}
}

export const planningFilterStore = new PlanningFilterStore();
