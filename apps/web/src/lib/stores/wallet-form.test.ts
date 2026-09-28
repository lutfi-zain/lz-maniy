import { describe, it, expect, beforeEach } from 'vitest';
import { WalletFormStore } from './wallet-form.svelte';
import type { WalletItem } from '$lib/types/account-detail';

const sampleWallet: WalletItem = {
	walletId: 'w-101',
	walletName: 'BCA Utama',
	institution: 'BCA',
	type: 'bank',
	balance: 5000000,
	currency: 'IDR',
	isLocked: 0,
	lastTransaction: null
};

describe('WalletFormStore', () => {
	let store: WalletFormStore;

	beforeEach(() => {
		store = new WalletFormStore();
	});

	it('initializes with default state', () => {
		expect(store.isOpen).toBe(false);
		expect(store.mode).toBe('create');
		expect(store.name).toBe('');
		expect(store.institution).toBe('BCA');
		expect(store.type).toBe('bank');
		expect(store.balance).toBe(0);
		expect(store.currency).toBe('IDR');
		expect(store.isLocked).toBe(false);
	});

	it('openCreate() resets fields and opens drawer', () => {
		store.openCreate();
		expect(store.isOpen).toBe(true);
		expect(store.mode).toBe('create');
		expect(store.existingWallet).toBeNull();
		expect(store.name).toBe('');
		expect(store.balance).toBe(0);
	});

	it('openEdit() populates fields from an existing wallet', () => {
		store.openEdit(sampleWallet);
		expect(store.isOpen).toBe(true);
		expect(store.mode).toBe('edit');
		expect(store.existingWallet).toBe(sampleWallet);
		expect(store.name).toBe('BCA Utama');
		expect(store.institution).toBe('BCA');
		expect(store.type).toBe('bank');
		expect(store.balance).toBe(5000000);
		expect(store.currency).toBe('IDR');
		expect(store.isLocked).toBe(false);
	});

	it('isValid rejects empty name', () => {
		store.openCreate();
		expect(store.isValid).toBe(false);

		store.name = '   ';
		expect(store.isValid).toBe(false);

		store.name = 'Dompet Jago';
		expect(store.isValid).toBe(true);
	});

	it('isValid requires numeric balance', () => {
		store.name = 'Kas Tunai';
		store.balance = null;
		expect(store.isValid).toBe(false);

		store.balance = 100000;
		expect(store.isValid).toBe(true);
	});

	it('close() resets fields and closes drawer', () => {
		store.openEdit(sampleWallet);
		store.close();
		expect(store.isOpen).toBe(false);
		expect(store.name).toBe('');
		expect(store.existingWallet).toBe(sampleWallet); // existingWallet is reset on next openCreate
	});
});
