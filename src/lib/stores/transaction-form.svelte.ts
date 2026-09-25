import type { TransactionRecord, TransactionType } from '$lib/types/account-detail';

function getTodayString(): string {
	const now = new Date();
	const y = now.getFullYear();
	const m = String(now.getMonth() + 1).padStart(2, '0');
	const d = String(now.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

export class TransactionFormStore {
	isOpen = $state<boolean>(false);
	mode = $state<'create' | 'edit' | 'view'>('create');
	transactionType = $state<TransactionType>('expense');
	existingTransaction = $state<TransactionRecord | null>(null);
	isSaving = $state<boolean>(false);
	error = $state<string | null>(null);
	successMessage = $state<string | null>(null);

	// Form fields
	walletId = $state<string>('');
	targetWalletId = $state<string>('');
	categoryId = $state<string>('');
	budgetId = $state<string>('');
	amount = $state<number | null>(null);
	adminFee = $state<number>(0);
	description = $state<string>('');
	date = $state<string>(getTodayString());
	isPlanned = $state<boolean>(false);

	// Validation derived state
	isValid = $derived.by(() => {
		const hasValidAmount = this.amount !== null && this.amount > 0 && !isNaN(this.amount);
		const hasValidDate = this.date.trim().length > 0;
		const hasSourceWallet = this.walletId.trim().length > 0;

		if (!hasValidAmount || !hasValidDate || !hasSourceWallet) {
			return false;
		}

		if (this.transactionType === 'transfer') {
			const hasTargetWallet = this.targetWalletId.trim().length > 0;
			const distinctWallets = this.walletId !== this.targetWalletId;
			return hasTargetWallet && distinctWallets;
		}

		// Expense or Income requires a category
		return this.categoryId.trim().length > 0;
	});

	openCreate(defaultType: TransactionType = 'expense') {
		this.resetFields();
		this.mode = 'create';
		this.transactionType = defaultType;
		this.existingTransaction = null;
		this.error = null;
		this.successMessage = null;
		this.isOpen = true;
	}

	openView(transaction: TransactionRecord) {
		this.existingTransaction = transaction;
		this.mode = 'view';
		this.transactionType = transaction.transactionType;
		this.error = null;
		this.successMessage = null;
		this.populateFromTransaction(transaction);
		this.isOpen = true;
	}

	openEdit(transaction: TransactionRecord) {
		this.existingTransaction = transaction;
		this.mode = 'edit';
		this.transactionType = transaction.transactionType;
		this.error = null;
		this.successMessage = null;
		this.populateFromTransaction(transaction);
		this.isOpen = true;
	}

	setType(type: TransactionType) {
		this.transactionType = type;
		// Reset type-specific fields
		if (type !== 'transfer') {
			this.targetWalletId = '';
		}
		if (type !== 'expense') {
			this.budgetId = '';
		}
	}

	close() {
		this.isOpen = false;
		this.error = null;
		this.successMessage = null;
		this.isSaving = false;
	}

	resetFields() {
		this.walletId = '';
		this.targetWalletId = '';
		this.categoryId = '';
		this.budgetId = '';
		this.amount = null;
		this.adminFee = 0;
		this.description = '';
		this.date = getTodayString();
		this.isPlanned = false;
	}

	private populateFromTransaction(t: TransactionRecord) {
		this.walletId = t.transactionWalletId;
		this.targetWalletId = t.transactionTargetWalletId ?? '';
		this.categoryId = t.transactionCategoryId ?? '';
		this.budgetId = t.transactionBudgetId ?? '';
		this.amount = t.transactionAmount;
		this.adminFee = t.transactionAdminFee ?? 0;
		this.description = t.transactionDescription ?? '';
		this.date = t.transactionDate ? t.transactionDate.slice(0, 10) : getTodayString();
		this.isPlanned = t.transactionIsPlanned === 1;
	}
}

export const transactionFormStore = new TransactionFormStore();
