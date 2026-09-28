import type { CategoryRecord } from '$lib/types/account-detail';
import { reedrichStore } from '$lib/stores/reedrich.svelte';

export class CategoryFormStore {
	isOpen = $state<boolean>(false);
	mode = $state<'create' | 'edit'>('create');
	existingCategory = $state<CategoryRecord | null>(null);
	isSaving = $state<boolean>(false);
	error = $state<string | null>(null);

	// Form fields
	name = $state<string>('');
	type = $state<'expense' | 'income'>('expense');
	icon = $state<string>('🏷️');

	isValid = $derived.by(() => {
		return this.name.trim().length > 0;
	});

	openCreate(defaultType: 'expense' | 'income' = 'expense') {
		this.mode = 'create';
		this.existingCategory = null;
		this.resetFields();
		this.type = defaultType;
		this.isOpen = true;
		reedrichStore.openDrawer({
			type: 'category-form',
			title: 'Tambah Kategori',
			subtitle: 'Buat kategori transaksi pengeluaran atau pemasukan baru',
			badge: 'KATEGORI',
			data: {}
		});
	}

	openEdit(category: CategoryRecord) {
		this.mode = 'edit';
		this.existingCategory = category;
		this.name = category.categoryName;
		this.type = category.categoryType;
		this.icon = category.categoryIcon || '🏷️';
		this.error = null;
		this.isOpen = true;
		reedrichStore.openDrawer({
			type: 'category-form',
			title: 'Edit Kategori',
			subtitle: category.categoryName,
			badge: 'EDIT KATEGORI',
			data: { category }
		});
	}

	close() {
		this.isOpen = false;
		this.resetFields();
		reedrichStore.closeDrawer();
	}

	resetFields() {
		this.name = '';
		this.type = 'expense';
		this.icon = '🏷️';
		this.error = null;
		this.isSaving = false;
	}
}

export const categoryFormStore = new CategoryFormStore();
