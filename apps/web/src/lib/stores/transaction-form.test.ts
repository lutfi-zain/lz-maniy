import { describe, it, expect, beforeEach } from 'vitest';
import { TransactionFormStore } from './transaction-form.svelte';
import type { TransactionRecord } from '$lib/types/account-detail';

const sampleTxn: TransactionRecord = {
	transactionId: 'txn-123',
	transactionWalletId: 'wallet-a',
	transactionTargetWalletId: 'wallet-b',
	transactionCategoryId: 'cat-food',
	transactionBudgetId: 'bgt-1',
	transactionAmount: 150000,
	transactionAdminFee: 2500,
	transactionType: 'expense',
	transactionDescription: 'Lunch at Cafe',
	transactionIsPlanned: 0,
	transactionDate: '2026-09-25T12:00:00+07:00'
};

describe('TransactionFormStore', () => {
	let store: TransactionFormStore;

	beforeEach(() => {
		store = new TransactionFormStore();
	});

	it('initializes with closed state and defaults', () => {
		expect(store.isOpen).toBe(false);
		expect(store.mode).toBe('create');
		expect(store.transactionType).toBe('expense');
		expect(store.amount).toBeNull();
		expect(store.adminFee).toBe(0);
		expect(store.isPlanned).toBe(false);
	});

	it('openCreate() resets fields and sets create mode', () => {
		store.walletId = 'dirty-wallet';
		store.openCreate('income');

		expect(store.isOpen).toBe(true);
		expect(store.mode).toBe('create');
		expect(store.transactionType).toBe('income');
		expect(store.walletId).toBe('');
		expect(store.existingTransaction).toBeNull();
	});

	it('openView() populates transaction metadata and enters view mode', () => {
		store.openView(sampleTxn);

		expect(store.isOpen).toBe(true);
		expect(store.mode).toBe('view');
		expect(store.existingTransaction).toBe(sampleTxn);
		expect(store.walletId).toBe('wallet-a');
		expect(store.targetWalletId).toBe('wallet-b');
		expect(store.categoryId).toBe('cat-food');
		expect(store.budgetId).toBe('bgt-1');
		expect(store.amount).toBe(150000);
		expect(store.adminFee).toBe(2500);
		expect(store.description).toBe('Lunch at Cafe');
		expect(store.date).toBe('2026-09-25');
		expect(store.isPlanned).toBe(false);
	});

	it('openEdit() populates fields and enters edit mode', () => {
		store.openEdit(sampleTxn);

		expect(store.isOpen).toBe(true);
		expect(store.mode).toBe('edit');
		expect(store.amount).toBe(150000);
	});

	it('close() sets isOpen to false and resets transient messages', () => {
		store.openCreate();
		store.error = 'Some error';
		store.successMessage = 'Success';
		store.close();

		expect(store.isOpen).toBe(false);
		expect(store.error).toBeNull();
		expect(store.successMessage).toBeNull();
	});

	it('setType() resets type-specific fields while preserving shared fields', () => {
		store.openCreate();
		store.amount = 50000;
		store.description = 'Shared note';
		store.targetWalletId = 'wallet-target';
		store.budgetId = 'budget-x';

		// Switch to expense -> targetWalletId cleared
		store.setType('expense');
		expect(store.targetWalletId).toBe('');
		expect(store.amount).toBe(50000);
		expect(store.description).toBe('Shared note');

		// Switch to income -> budgetId cleared
		store.budgetId = 'budget-x';
		store.setType('income');
		expect(store.budgetId).toBe('');
		expect(store.amount).toBe(50000);
	});

	it('supports isPlanned toggle for transfer in create and edit modes', () => {
		// Create mode with transfer
		store.openCreate('transfer');
		expect(store.transactionType).toBe('transfer');
		expect(store.isPlanned).toBe(false);

		// Toggle isPlanned to true
		store.isPlanned = true;
		expect(store.isPlanned).toBe(true);

		// Edit mode with planned transfer
		const plannedTransfer: TransactionRecord = {
			...sampleTxn,
			transactionType: 'transfer',
			transactionTargetWalletId: 'wallet-target',
			transactionIsPlanned: 1
		};
		store.openEdit(plannedTransfer);
		expect(store.mode).toBe('edit');
		expect(store.transactionType).toBe('transfer');
		expect(store.isPlanned).toBe(true);

		// Toggle isPlanned to false (realize)
		store.isPlanned = false;
		expect(store.isPlanned).toBe(false);
	});

	describe('isValid validation logic', () => {
		it('validates expense requires wallet, category, positive amount, and date', () => {
			store.openCreate('expense');
			expect(store.isValid).toBe(false);

			store.walletId = 'wallet-1';
			expect(store.isValid).toBe(false);

			store.categoryId = 'cat-1';
			expect(store.isValid).toBe(false);

			store.amount = 10000;
			expect(store.isValid).toBe(true);

			store.amount = 0;
			expect(store.isValid).toBe(false);

			store.amount = -500;
			expect(store.isValid).toBe(false);
		});

		it('validates transfer requires source and distinct target wallet', () => {
			store.openCreate('transfer');
			store.walletId = 'wallet-1';
			store.amount = 20000;
			expect(store.isValid).toBe(false);

			// Same wallet -> invalid
			store.targetWalletId = 'wallet-1';
			expect(store.isValid).toBe(false);

			// Distinct wallet -> valid
			store.targetWalletId = 'wallet-2';
			expect(store.isValid).toBe(true);
		});
	});
});
