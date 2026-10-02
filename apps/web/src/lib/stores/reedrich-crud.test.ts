import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReedrichStore } from './reedrich.svelte';

describe('ReedrichStore - Entity CRUD Operations', () => {
	let store: ReedrichStore;

	beforeEach(() => {
		store = new ReedrichStore(false);
		vi.restoreAllMocks();
	});

	// --- Wallets ---
	describe('Wallets CRUD', () => {
		it('createWallet() sends POST and returns created wallet', async () => {
			const mockWallet = { walletId: 'w-new', walletName: 'BCA New', balance: 1000 };
			const mockFetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
				if (init?.method === 'POST') {
					return Promise.resolve(new Response(JSON.stringify(mockWallet), { status: 201 }));
				}
				// invalidateAndRefresh requests
				return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
			});
			vi.stubGlobal('fetch', mockFetch);

			const result = await store.createWallet({ name: 'BCA New', balance: 1000 });
			expect(result).toEqual(mockWallet);
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('/api/v1/wallets'),
				expect.objectContaining({ method: 'POST' })
			);
		});

		it('updateWallet() sends PATCH with delta', async () => {
			const updatedWallet = { walletId: 'w-1', walletName: 'BCA Updated' };
			const mockFetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
				if (init?.method === 'PATCH') {
					return Promise.resolve(new Response(JSON.stringify(updatedWallet), { status: 200 }));
				}
				return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
			});
			vi.stubGlobal('fetch', mockFetch);

			const result = await store.updateWallet('w-1', { name: 'BCA Updated' });
			expect(result).toEqual(updatedWallet);
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('/api/v1/wallets/w-1'),
				expect.objectContaining({ method: 'PATCH' })
			);
		});

		it('deleteWallet() sends DELETE', async () => {
			const mockFetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
				if (init?.method === 'DELETE') {
					return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
				}
				return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
			});
			vi.stubGlobal('fetch', mockFetch);

			await expect(store.deleteWallet('w-empty')).resolves.toBeUndefined();
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('/api/v1/wallets/w-empty'),
				expect.objectContaining({ method: 'DELETE' })
			);
		});

		it('deleteWallet() throws when server responds with 400', async () => {
			const mockFetch = vi
				.fn()
				.mockResolvedValue(
					new Response(JSON.stringify({ message: 'Balance must be 0' }), { status: 400 })
				);
			vi.stubGlobal('fetch', mockFetch);

			await expect(store.deleteWallet('w-non-empty')).rejects.toThrow('Balance must be 0');
		});
	});
	// --- Transfers ---
	describe('Transfers CRUD', () => {
		it('createTransfer() sends POST with isPlanned: true and returns transaction', async () => {
			const mockTransferTxn = {
				transactionId: 'tx-transfer-1',
				transactionType: 'transfer',
				transactionWalletId: 'w-src',
				transactionTargetWalletId: 'w-tgt',
				transactionAmount: 100000,
				transactionIsPlanned: 1
			};
			const mockFetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
				if (init?.method === 'POST') {
					return Promise.resolve(new Response(JSON.stringify(mockTransferTxn), { status: 201 }));
				}
				return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
			});
			vi.stubGlobal('fetch', mockFetch);

			const result = await store.createTransfer({
				sourceWalletId: 'w-src',
				targetWalletId: 'w-tgt',
				amount: 100000,
				isPlanned: true
			});

			expect(result).toEqual(mockTransferTxn);
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('/api/v1/transfers'),
				expect.objectContaining({
					method: 'POST',
					body: expect.stringContaining('"isPlanned":true')
				})
			);
		});
	});

	// --- Categories ---
	describe('Categories CRUD', () => {
		it('createCategory() sends POST', async () => {
			const mockCat = { categoryId: 'c-1', categoryName: 'Makan', categoryType: 'expense' };
			const mockFetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
				if (init?.method === 'POST') {
					return Promise.resolve(new Response(JSON.stringify(mockCat), { status: 201 }));
				}
				return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
			});
			vi.stubGlobal('fetch', mockFetch);

			const result = await store.createCategory({ name: 'Makan', type: 'expense' });
			expect(result).toEqual(mockCat);
		});

		it('updateCategory() sends PATCH', async () => {
			const mockCat = { categoryId: 'c-1', categoryName: 'Makan Enak' };
			const mockFetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
				if (init?.method === 'PATCH') {
					return Promise.resolve(new Response(JSON.stringify(mockCat), { status: 200 }));
				}
				return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
			});
			vi.stubGlobal('fetch', mockFetch);

			const result = await store.updateCategory('c-1', { name: 'Makan Enak' });
			expect(result).toEqual(mockCat);
		});

		it('deleteCategory() sends DELETE', async () => {
			const mockFetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
				if (init?.method === 'DELETE') {
					return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
				}
				return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
			});
			vi.stubGlobal('fetch', mockFetch);

			await expect(store.deleteCategory('c-1')).resolves.toBeUndefined();
		});
	});

	// --- Budgets ---
	describe('Budgets CRUD', () => {
		it('createBudget() sends POST', async () => {
			const mockBudget = { budgetId: 'b-1', budgetName: 'Food Budget', amount: 2000000 };
			const mockFetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
				if (init?.method === 'POST') {
					return Promise.resolve(new Response(JSON.stringify(mockBudget), { status: 201 }));
				}
				return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
			});
			vi.stubGlobal('fetch', mockFetch);

			const result = await store.createBudget({
				name: 'Food Budget',
				amount: 2000000,
				periodStart: '2026-09-01T00:00:00Z',
				periodEnd: '2026-09-30T23:59:59Z'
			});
			expect(result).toEqual(mockBudget);
		});

		it('updateBudget() sends PATCH', async () => {
			const mockBudget = { budgetId: 'b-1', amount: 3000000 };
			const mockFetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
				if (init?.method === 'PATCH') {
					return Promise.resolve(new Response(JSON.stringify(mockBudget), { status: 200 }));
				}
				return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
			});
			vi.stubGlobal('fetch', mockFetch);

			const result = await store.updateBudget('b-1', { amount: 3000000 });
			expect(result).toEqual(mockBudget);
		});

		it('deleteBudget() sends DELETE', async () => {
			const mockFetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
				if (init?.method === 'DELETE') {
					return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
				}
				return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
			});
			vi.stubGlobal('fetch', mockFetch);

			await expect(store.deleteBudget('b-1')).resolves.toBeUndefined();
		});
	});

	// --- Goals ---
	describe('Goals CRUD', () => {
		it('createGoal() sends POST', async () => {
			const mockGoal = { goalId: 'g-1', goalName: 'Liburan', targetAmount: 10000000 };
			const mockFetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
				if (init?.method === 'POST') {
					return Promise.resolve(new Response(JSON.stringify(mockGoal), { status: 201 }));
				}
				return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
			});
			vi.stubGlobal('fetch', mockFetch);

			const result = await store.createGoal({ name: 'Liburan', targetAmount: 10000000 });
			expect(result).toEqual(mockGoal);
		});
		it('linkGoalWallet() sends POST to /wallets', async () => {
			const mockFetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
				if (init?.method === 'POST') {
					return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
				}
				return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
			});
			vi.stubGlobal('fetch', mockFetch);

			await expect(store.linkGoalWallet('g-1', 'w-1')).resolves.toBeUndefined();
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('/api/v1/goals/g-1/wallets'),
				expect.anything()
			);
		});

		it('unlinkGoalWallet() sends DELETE to /wallets/{walletId}', async () => {
			const mockFetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
				if (init?.method === 'DELETE') {
					return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
				}
				return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
			});
			vi.stubGlobal('fetch', mockFetch);

			await expect(store.unlinkGoalWallet('g-1', 'w-1')).resolves.toBeUndefined();
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('/api/v1/goals/g-1/wallets/w-1'),
				expect.objectContaining({ method: 'DELETE' })
			);
		});
	});

	// --- Recurring Templates ---
	describe('Recurring Templates CRUD', () => {
		it('fetchRecurringTemplates() fetches and updates store state', async () => {
			const items = [{ templateId: 't-1', templateName: 'PLN' }];
			const mockFetch = vi
				.fn()
				.mockResolvedValue(new Response(JSON.stringify(items), { status: 200 }));
			vi.stubGlobal('fetch', mockFetch);

			const result = await store.fetchRecurringTemplates();
			expect(result).toEqual(items);
			expect(store.recurringTemplates).toEqual(items);
		});

		it('applyRecurringTemplate() sends POST to /apply and returns transaction', async () => {
			const mockTxn = { transactionId: 'txn-applied', transactionAmount: 150000 };
			const mockFetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
				if (init?.method === 'POST') {
					return Promise.resolve(
						new Response(JSON.stringify({ transaction: mockTxn }), { status: 200 })
					);
				}
				return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
			});
			vi.stubGlobal('fetch', mockFetch);

			const result = await store.applyRecurringTemplate('t-1');
			expect(result).toEqual(mockTxn);
		});
	});

	// --- Profile ---
	describe('Profile Update', () => {
		it('updateProfile() sends PATCH to /api/v1/me', async () => {
			const mockProfile = { userId: 'u-1', firstName: 'Budi', lastName: 'Setiawan' };
			const mockFetch = vi
				.fn()
				.mockResolvedValue(new Response(JSON.stringify(mockProfile), { status: 200 }));
			vi.stubGlobal('fetch', mockFetch);

			const result = await store.updateProfile({ firstName: 'Budi' });
			expect(result).toEqual(mockProfile);
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('/api/v1/me'),
				expect.objectContaining({ method: 'PATCH' })
			);
		});
	});
});
