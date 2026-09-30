import type { RecurringTemplate } from '$lib/types/account-detail';
import { reedrichStore } from '$lib/stores/reedrich.svelte';

function getTodayString(): string {
	const now = new Date();
	const y = now.getFullYear();
	const m = String(now.getMonth() + 1).padStart(2, '0');
	const d = String(now.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

export class RecurringFormStore {
	isOpen = $state<boolean>(false);
	mode = $state<'create' | 'edit'>('create');
	existingTemplate = $state<RecurringTemplate | null>(null);
	isSaving = $state<boolean>(false);
	error = $state<string | null>(null);

	// Form fields
	name = $state<string>('');
	walletId = $state<string>('');
	targetWalletId = $state<string>('');
	categoryId = $state<string>('');
	amount = $state<number | null>(null);
	adminFee = $state<number>(0);
	type = $state<'expense' | 'income' | 'transfer'>('expense');
	frequency = $state<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
	interval = $state<number>(1);
	startDate = $state<string>(getTodayString());
	endDate = $state<string>('');
	notes = $state<string>('');
	isActive = $state<boolean>(true);

	isValid = $derived.by(() => {
		if (!this.name.trim()) return false;
		if (this.amount === null || isNaN(this.amount) || this.amount <= 0) return false;
		if (!this.walletId) return false;
		if (this.type === 'transfer' && !this.targetWalletId) return false;
		if (!this.startDate) return false;
		if (this.endDate && this.endDate < this.startDate) return false;
		return true;
	});

	openCreate(defaultType: 'expense' | 'income' | 'transfer' = 'expense') {
		this.mode = 'create';
		this.existingTemplate = null;
		this.resetFields();
		this.type = defaultType;
		if (reedrichStore.allWallets.length > 0) {
			this.walletId = reedrichStore.allWallets[0].walletId;
		}
		this.isOpen = true;
		reedrichStore.openDrawer({
			type: 'recurring-form',
			title: 'Tambah Tagihan Rutin',
			subtitle: 'Jadwalkan pengeluaran, pemasukan, atau transfer berulang otomatis',
			badge: 'RECURRING',
			data: {}
		});
	}

	openEdit(template: RecurringTemplate) {
		this.mode = 'edit';
		this.existingTemplate = template;
		this.name = template.templateName;
		this.walletId = template.templateWalletId;
		this.targetWalletId = template.templateTargetWalletId || '';
		this.categoryId = template.templateCategoryId || '';
		this.amount = template.templateAmount;
		this.adminFee = template.templateAdminFee || 0;
		this.type = template.templateType;
		this.frequency = template.templateFrequency;
		this.interval = template.templateInterval || 1;
		this.startDate = template.templateStartDate
			? template.templateStartDate.slice(0, 10)
			: getTodayString();
		this.endDate = template.templateEndDate ? template.templateEndDate.slice(0, 10) : '';
		this.notes = template.templateNotes || '';
		this.isActive = template.templateIsActive === 1 || template.templateIsActive === true;
		this.error = null;
		this.isOpen = true;
		reedrichStore.openDrawer({
			type: 'recurring-form',
			title: 'Edit Tagihan Rutin',
			subtitle: template.templateName,
			badge: 'EDIT RECURRING',
			data: { template }
		});
	}

	close() {
		this.isOpen = false;
		this.resetFields();
		reedrichStore.closeDrawer();
	}

	resetFields() {
		this.name = '';
		this.walletId = '';
		this.targetWalletId = '';
		this.categoryId = '';
		this.amount = null;
		this.adminFee = 0;
		this.type = 'expense';
		this.frequency = 'monthly';
		this.interval = 1;
		this.startDate = getTodayString();
		this.endDate = '';
		this.notes = '';
		this.isActive = true;
		this.error = null;
		this.isSaving = false;
	}
}

export const recurringFormStore = new RecurringFormStore();
