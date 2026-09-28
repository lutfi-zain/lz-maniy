import { describe, it, expect, beforeEach } from 'vitest';
import { RecurringFormStore } from './recurring-form.svelte';
import type { RecurringTemplate } from '$lib/types/account-detail';

const sampleTemplate: RecurringTemplate = {
	templateId: 'rec-01',
	templateName: 'Spotify Family',
	templateWalletId: 'w-1',
	templateAmount: 86900,
	templateAdminFee: 0,
	templateType: 'expense',
	templateFrequency: 'monthly',
	templateInterval: 1,
	templateStartDate: '2026-09-01',
	templateNextRunDate: '2026-10-01',
	templateEndDate: null,
	templateIsActive: 1,
	templateNotes: 'Autodebet bulanan'
};

describe('RecurringFormStore', () => {
	let store: RecurringFormStore;

	beforeEach(() => {
		store = new RecurringFormStore();
	});

	it('initializes with default state', () => {
		expect(store.isOpen).toBe(false);
		expect(store.mode).toBe('create');
		expect(store.name).toBe('');
		expect(store.amount).toBeNull();
		expect(store.frequency).toBe('monthly');
		expect(store.interval).toBe(1);
		expect(store.isActive).toBe(true);
	});

	it('openCreate() resets and sets create mode', () => {
		store.openCreate('income');
		expect(store.isOpen).toBe(true);
		expect(store.mode).toBe('create');
		expect(store.type).toBe('income');
	});

	it('openEdit() populates fields from template', () => {
		store.openEdit(sampleTemplate);
		expect(store.isOpen).toBe(true);
		expect(store.mode).toBe('edit');
		expect(store.name).toBe('Spotify Family');
		expect(store.walletId).toBe('w-1');
		expect(store.amount).toBe(86900);
		expect(store.frequency).toBe('monthly');
		expect(store.startDate).toBe('2026-09-01');
		expect(store.isActive).toBe(true);
	});

	it('isValid rejects missing name, non-positive amount, or missing walletId', () => {
		store.openCreate();
		expect(store.isValid).toBe(false);

		store.name = 'Langganan';
		store.walletId = 'w-1';
		store.amount = null;
		expect(store.isValid).toBe(false);

		store.amount = 50000;
		expect(store.isValid).toBe(true);

		// Transfer requires targetWalletId
		store.type = 'transfer';
		expect(store.isValid).toBe(false);
		store.targetWalletId = 'w-2';
		expect(store.isValid).toBe(true);
	});
});
