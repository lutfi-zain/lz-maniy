import type { GoalSnapshot } from '$lib/types/account-detail';
import { reedrichStore } from '$lib/stores/reedrich.svelte';

export class GoalFormStore {
	isOpen = $state<boolean>(false);
	mode = $state<'create' | 'edit'>('create');
	existingGoal = $state<GoalSnapshot | null>(null);
	isSaving = $state<boolean>(false);
	error = $state<string | null>(null);

	// Form fields
	name = $state<string>('');
	targetAmount = $state<number | null>(null);
	currentAmount = $state<number | null>(0);
	currency = $state<string>('IDR');
	targetDate = $state<string>('');
	walletIds = $state<string[]>([]);
	categoryId = $state<string>('');
	notes = $state<string>('');
	status = $state<'in_progress' | 'completed' | 'cancelled'>('in_progress');

	isDerived = $derived.by(() => this.walletIds.length > 0);

	isValid = $derived.by(() => {
		if (!this.name.trim()) return false;
		if (this.targetAmount === null || isNaN(this.targetAmount) || this.targetAmount <= 0)
			return false;
		return true;
	});

	openCreate() {
		this.mode = 'create';
		this.existingGoal = null;
		this.resetFields();
		this.isOpen = true;
		reedrichStore.openDrawer({
			type: 'goal-form',
			title: 'Buat Target Tabungan',
			subtitle: 'Rencanakan sasaran keuangan jangka pendek atau panjang',
			badge: 'TARGET',
			data: {}
		});
	}

	openEdit(goal: GoalSnapshot) {
		this.mode = 'edit';
		this.existingGoal = goal;
		this.name = goal.goalName;
		this.targetAmount = goal.targetAmount;
		this.currentAmount = goal.currentAmount;
		this.currency = goal.currency || 'IDR';
		this.targetDate = goal.targetDate ? goal.targetDate.slice(0, 10) : '';
		this.walletIds = goal.linkedWalletsBreakdown ? goal.linkedWalletsBreakdown.map((w) => w.walletId) : [];
		this.categoryId = goal.categoryId || '';
		this.notes = goal.notes || '';
		this.status = goal.status || 'in_progress';
		this.error = null;
		this.isOpen = true;
		reedrichStore.openDrawer({
			type: 'goal-form',
			title: 'Edit Target Tabungan',
			subtitle: goal.goalName,
			badge: 'EDIT TARGET',
			data: { goal }
		});
	}

	close() {
		this.isOpen = false;
		this.resetFields();
		reedrichStore.closeDrawer();
	}

	resetFields() {
		this.name = '';
		this.targetAmount = null;
		this.currentAmount = 0;
		this.currency = 'IDR';
		this.targetDate = '';
		this.walletIds = [];
		this.categoryId = '';
		this.notes = '';
		this.status = 'in_progress';
		this.error = null;
		this.isSaving = false;
	}
}

export const goalFormStore = new GoalFormStore();
