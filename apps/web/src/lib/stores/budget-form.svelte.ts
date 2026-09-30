import type { BudgetSnapshot } from '$lib/types/account-detail';
import { reedrichStore } from '$lib/stores/reedrich.svelte';

function getCurrentMonthRange(): { start: string; end: string } {
	const now = new Date();
	const y = now.getFullYear();
	const m = now.getMonth();
	const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
	const lastDay = new Date(y, m + 1, 0).getDate();
	const end = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
	return { start, end };
}

export class BudgetFormStore {
	isOpen = $state<boolean>(false);
	mode = $state<'create' | 'edit'>('create');
	existingBudget = $state<BudgetSnapshot | null>(null);
	isSaving = $state<boolean>(false);
	isHydrating = $state<boolean>(false);
	error = $state<string | null>(null);

	// Form fields
	name = $state<string>('');
	amount = $state<number | null>(null);
	periodStart = $state<string>('');
	periodEnd = $state<string>('');
	categoryId = $state<string>('');
	notes = $state<string>('');

	isValid = $derived.by(() => {
		if (!this.name.trim()) return false;
		if (this.amount === null || isNaN(this.amount) || this.amount <= 0) return false;
		if (!this.periodStart || !this.periodEnd) return false;
		if (this.periodEnd < this.periodStart) return false;
		return true;
	});

	openCreate() {
		this.mode = 'create';
		this.existingBudget = null;
		this.resetFields();
		const { start, end } = getCurrentMonthRange();
		this.periodStart = start;
		this.periodEnd = end;
		this.isOpen = true;
		reedrichStore.openDrawer({
			type: 'budget-form',
			title: 'Tambah Pagu Anggaran',
			subtitle: 'Tentukan batas belanja bulanan berdasarkan kategori',
			badge: 'BUDGET',
			data: {}
		});
	}

	populateFields(budget: BudgetSnapshot) {
		this.existingBudget = budget;
		this.name = budget.budgetName;
		this.amount = budget.amount;
		this.periodStart = budget.periodStart ? budget.periodStart.slice(0, 10) : '';
		this.periodEnd = budget.periodEnd ? budget.periodEnd.slice(0, 10) : '';
		this.categoryId = budget.categoryId || '';
		this.notes = budget.notes || '';
	}

	async openEditWithHydration(budgetId: string, initialBudget?: BudgetSnapshot) {
		this.mode = 'edit';
		if (initialBudget) {
			this.populateFields(initialBudget);
		}
		this.error = null;
		this.isHydrating = true;
		this.isOpen = true;
		reedrichStore.openDrawer({
			type: 'budget-form',
			title: 'Edit Pagu Anggaran',
			subtitle: initialBudget?.budgetName || 'Memuat data anggaran...',
			badge: 'EDIT BUDGET',
			data: { budget: initialBudget }
		});

		try {
			const fresh = await reedrichStore.fetchBudgetById(budgetId);
			this.populateFields(fresh);
			reedrichStore.openDrawer({
				type: 'budget-form',
				title: 'Edit Pagu Anggaran',
				subtitle: fresh.budgetName,
				badge: 'EDIT BUDGET',
				data: { budget: fresh }
			});
		} catch (err) {
			console.warn('Gagal menghidrasi detail anggaran dari server:', err);
		} finally {
			this.isHydrating = false;
		}
	}

	openEdit(budget: BudgetSnapshot) {
		this.openEditWithHydration(budget.budgetId, budget);
	}

	close() {
		this.isOpen = false;
		this.resetFields();
		reedrichStore.closeDrawer();
	}

	resetFields() {
		this.name = '';
		this.amount = null;
		this.periodStart = '';
		this.periodEnd = '';
		this.categoryId = '';
		this.notes = '';
		this.error = null;
		this.isSaving = false;
	}
}

export const budgetFormStore = new BudgetFormStore();
