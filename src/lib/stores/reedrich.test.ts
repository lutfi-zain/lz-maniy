import { describe, it, expect, beforeEach } from 'vitest';
import { ReedrichStore } from './reedrich.svelte';

describe('ReedrichStore', () => {
	let store: ReedrichStore;

	beforeEach(() => {
		store = new ReedrichStore(true);
	});

	it('initializes with mock data correctly', () => {
		expect(store.snapshot).not.toBeNull();
		expect(store.isLive).toBe(false);
		expect(store.spendableWallets.length).toBe(11);
		expect(store.lockedWallets.length).toBe(6);
		expect(store.allWallets.length).toBe(17);
	});

	it('filters wallets by tab', () => {
		store.setTab('spendable');
		expect(store.filteredWallets.length).toBe(11);
		expect(store.filteredWallets.every((w) => w.isLocked === 0)).toBe(true);

		store.setTab('locked');
		expect(store.filteredWallets.length).toBe(6);
		expect(store.filteredWallets.every((w) => w.isLocked === 1)).toBe(true);

		store.setTab('all');
		expect(store.filteredWallets.length).toBe(17);
	});

	it('filters wallets by institution toggle', () => {
		store.filterByInstitution('BCA');
		expect(store.selectedInstitution).toBe('BCA');
		expect(store.filteredWallets.length).toBe(2);
		expect(store.filteredWallets.every((w) => w.institution === 'BCA')).toBe(true);

		// Clicking again toggles off
		store.filterByInstitution('BCA');
		expect(store.selectedInstitution).toBeNull();
		expect(store.filteredWallets.length).toBe(17);
	});

	it('computes bank subtotals accurately', () => {
		const bcaWallets = store.allWallets.filter((w) => w.institution === 'BCA');
		expect(bcaWallets.length).toBe(2);
		const bcaTotal = bcaWallets.reduce((acc, w) => acc + w.balance, 0);
		expect(bcaTotal).toBeCloseTo(8975931.69, 1);

		const jagoWallets = store.allWallets.filter((w) => w.institution === 'Bank Jago');
		expect(jagoWallets.length).toBe(11);
	});

	it('manages drawer open and close transitions', () => {
		expect(store.activeDrawer).toBeNull();

		store.openDrawer({
			type: 'wallet',
			title: 'BCA Main',
			subtitle: 'BCA Bank Account',
			badge: 'Spendable',
			data: { walletId: 'w1' }
		});

		expect(store.activeDrawer).not.toBeNull();
		expect(store.activeDrawer?.title).toBe('BCA Main');

		store.closeDrawer();
		expect(store.activeDrawer).toBeNull();
	});

	it('filters drawer transactions by search keyword', () => {
		store.drawerTransactions = [
			{
				transactionId: 't1',
				transactionWalletId: 'w1',
				transactionAmount: 100000,
				transactionType: 'expense',
				transactionDescription: 'Belanja Super Indo',
				transactionIsPlanned: 0,
				transactionDate: '2026-09-20'
			},
			{
				transactionId: 't2',
				transactionWalletId: 'w1',
				transactionAmount: 200000,
				transactionType: 'expense',
				transactionDescription: 'Beli bensin Shell',
				transactionIsPlanned: 0,
				transactionDate: '2026-09-21'
			}
		];

		store.drawerSearch = 'super indo';
		expect(store.filteredDrawerTransactions.length).toBe(1);
		expect(store.filteredDrawerTransactions[0].transactionId).toBe('t1');

		store.drawerSearch = 'shell';
		expect(store.filteredDrawerTransactions.length).toBe(1);
		expect(store.filteredDrawerTransactions[0].transactionId).toBe('t2');

		store.drawerSearch = 'tidak ada';
		expect(store.filteredDrawerTransactions.length).toBe(0);
	});
});
