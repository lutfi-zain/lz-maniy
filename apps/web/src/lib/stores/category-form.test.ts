import { describe, it, expect, beforeEach } from 'vitest';
import { CategoryFormStore } from './category-form.svelte';
import type { CategoryRecord } from '$lib/types/account-detail';

const sampleCategory: CategoryRecord = {
	categoryId: 'cat-01',
	categoryName: 'Transportasi',
	categoryType: 'expense',
	categoryIcon: '🚗'
};

describe('CategoryFormStore', () => {
	let store: CategoryFormStore;

	beforeEach(() => {
		store = new CategoryFormStore();
	});

	it('initializes with default state', () => {
		expect(store.isOpen).toBe(false);
		expect(store.mode).toBe('create');
		expect(store.name).toBe('');
		expect(store.type).toBe('expense');
		expect(store.icon).toBe('Tag');
	});

	it('openCreate() resets and sets default type', () => {
		store.openCreate('income');
		expect(store.isOpen).toBe(true);
		expect(store.mode).toBe('create');
		expect(store.type).toBe('income');
		expect(store.name).toBe('');
	});

	it('openEdit() populates fields from category', () => {
		store.openEdit(sampleCategory);
		expect(store.isOpen).toBe(true);
		expect(store.mode).toBe('edit');
		expect(store.name).toBe('Transportasi');
		expect(store.type).toBe('expense');
		expect(store.icon).toBe('🚗');
	});

	it('isValid rejects empty name', () => {
		store.openCreate();
		expect(store.isValid).toBe(false);
		store.name = 'Makan';
		expect(store.isValid).toBe(true);
	});
});
