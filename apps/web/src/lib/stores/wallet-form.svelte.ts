import type { WalletItem } from '$lib/types/account-detail';
import { reedrichStore } from '$lib/stores/reedrich.svelte';

export class WalletFormStore {
	isOpen = $state<boolean>(false);
	mode = $state<'create' | 'edit'>('create');
	existingWallet = $state<WalletItem | null>(null);
	isSaving = $state<boolean>(false);
	isHydrating = $state<boolean>(false);
	error = $state<string | null>(null);

	// Form fields
	name = $state<string>('');
	institution = $state<string>('BCA');
	type = $state<'bank' | 'cash' | 'e-wallet' | 'credit' | 'crypto' | 'investment'>('bank');
	balance = $state<number | null>(0);
	currency = $state<string>('IDR');
	isLocked = $state<boolean>(false);

	isValid = $derived.by(() => {
		if (!this.name.trim()) return false;
		if (this.balance === null || isNaN(this.balance)) return false;
		return true;
	});

	openCreate() {
		this.mode = 'create';
		this.existingWallet = null;
		this.resetFields();
		this.isOpen = true;
		reedrichStore.openDrawer({
			type: 'wallet-form',
			title: 'Tambah Dompet',
			subtitle: 'Buat rekening atau akun dompet baru',
			badge: 'BUAT BARU',
			data: {}
		});
	}

	populateFields(wallet: WalletItem) {
		this.existingWallet = wallet;
		this.name = wallet.walletName;
		this.institution = wallet.institution || 'BCA';
		this.type = wallet.type || 'bank';
		this.balance = wallet.balance;
		this.currency = wallet.currency || 'IDR';
		this.isLocked = wallet.isLocked === 1;
	}

	async openEditWithHydration(walletId: string, initialWallet?: WalletItem) {
		this.mode = 'edit';
		if (initialWallet) {
			this.populateFields(initialWallet);
		}
		this.error = null;
		this.isHydrating = true;
		this.isOpen = true;
		reedrichStore.openDrawer({
			type: 'wallet-form',
			title: 'Edit Dompet',
			subtitle: initialWallet?.walletName || 'Memuat data dompet...',
			badge: 'EDIT',
			data: { wallet: initialWallet }
		});

		try {
			const fresh = await reedrichStore.fetchWalletById(walletId);
			this.populateFields(fresh);
			reedrichStore.openDrawer({
				type: 'wallet-form',
				title: 'Edit Dompet',
				subtitle: fresh.walletName,
				badge: 'EDIT',
				data: { wallet: fresh }
			});
		} catch (err) {
			console.warn('Gagal menghidrasi dompet dari server:', err);
		} finally {
			this.isHydrating = false;
		}
	}

	openEdit(wallet: WalletItem) {
		this.openEditWithHydration(wallet.walletId, wallet);
	}
	close() {
		this.isOpen = false;
		this.resetFields();
		reedrichStore.closeDrawer();
	}

	resetFields() {
		this.name = '';
		this.institution = 'BCA';
		this.type = 'bank';
		this.balance = 0;
		this.currency = 'IDR';
		this.isLocked = false;
		this.error = null;
		this.isSaving = false;
	}
}

export const walletFormStore = new WalletFormStore();
