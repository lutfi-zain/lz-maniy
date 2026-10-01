import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReedrichStore } from './reedrich.svelte';
import { authStore } from './auth.svelte';

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

	it('fetches user profile from /me and hydrates authStore', async () => {
		const mockProfile = {
			userId: 'usr_mswp4uie',
			firstName: 'Lutfi',
			lastName: 'Zain',
			fullName: 'Lutfi Zain',
			email: 'lutfidmz@gmail.com',
			whatsappNumber: '+6282216557939',
			createdAt: '2026-08-17T03:50:49.718Z'
		};

		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => mockProfile
			})
		);

		store.apiToken = 'test-token';
		const profile = await store.fetchUserProfile();

		expect(profile).not.toBeNull();
		expect(profile?.fullName).toBe('Lutfi Zain');
		expect(authStore.user?.fullName).toBe('Lutfi Zain');
		expect(authStore.user?.whatsappNumber).toBe('+6282216557939');
	});

	describe('Transaction Mutations', () => {
		it('createTransaction sends POST and refreshes state', async () => {
			const mockCreated = {
				transactionId: 'txn-new-1',
				transactionWalletId: 'w-1',
				transactionCategoryId: 'cat-1',
				transactionAmount: 75000,
				transactionType: 'expense',
				transactionDate: '2026-09-25T00:00:00Z',
				transactionIsPlanned: 0
			};

			const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
				if (url.endsWith('/api/v1/transactions') && init?.method === 'POST') {
					return Promise.resolve({
						ok: true,
						json: async () => mockCreated
					});
				}
				return Promise.resolve({
					ok: true,
					json: async () => ({})
				});
			});
			vi.stubGlobal('fetch', fetchMock);

			const result = await store.createTransaction({
				walletId: 'w-1',
				categoryId: 'cat-1',
				amount: 75000,
				type: 'expense',
				date: '2026-09-25'
			});

			expect(result.transactionId).toBe('txn-new-1');
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining('/api/v1/transactions'),
				expect.objectContaining({
					method: 'POST',
					body: expect.stringContaining('"amount":75000')
				})
			);
		});

		it('createTransfer sends POST to /api/v1/transfers', async () => {
			const mockTransfer = {
				transactionId: 'txn-transfer-1',
				transactionWalletId: 'w-src',
				transactionTargetWalletId: 'w-dst',
				transactionAmount: 250000,
				transactionType: 'transfer',
				transactionDate: '2026-09-25T00:00:00Z',
				transactionIsPlanned: 0
			};

			const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
				if (url.endsWith('/api/v1/transfers') && init?.method === 'POST') {
					return Promise.resolve({
						ok: true,
						json: async () => mockTransfer
					});
				}
				return Promise.resolve({
					ok: true,
					json: async () => ({})
				});
			});
			vi.stubGlobal('fetch', fetchMock);

			const result = await store.createTransfer({
				sourceWalletId: 'w-src',
				targetWalletId: 'w-dst',
				amount: 250000
			});

			expect(result.transactionType).toBe('transfer');
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining('/api/v1/transfers'),
				expect.objectContaining({
					method: 'POST',
					body: expect.stringContaining('"targetWalletId":"w-dst"')
				})
			);
		});

		it('updateTransaction sends PATCH and handles delta', async () => {
			const mockUpdated = {
				transactionId: 'txn-1',
				transactionAmount: 80000
			};

			const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
				if (url.includes('/api/v1/transactions/txn-1') && init?.method === 'PATCH') {
					return Promise.resolve({
						ok: true,
						json: async () => mockUpdated
					});
				}
				return Promise.resolve({
					ok: true,
					json: async () => ({})
				});
			});
			vi.stubGlobal('fetch', fetchMock);

			const result = await store.updateTransaction('txn-1', { amount: 80000 });
			expect(result.transactionAmount).toBe(80000);
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining('/api/v1/transactions/txn-1'),
				expect.objectContaining({
					method: 'PATCH',
					body: expect.stringContaining('"amount":80000')
				})
			);
		});

		it('deleteTransaction sends DELETE request', async () => {
			const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
				if (url.includes('/api/v1/transactions/txn-del') && init?.method === 'DELETE') {
					return Promise.resolve({
						ok: true,
						json: async () => ({ success: true })
					});
				}
				return Promise.resolve({
					ok: true,
					json: async () => ({})
				});
			});
			vi.stubGlobal('fetch', fetchMock);

			await expect(store.deleteTransaction('txn-del')).resolves.toBeUndefined();
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining('/api/v1/transactions/txn-del'),
				expect.objectContaining({ method: 'DELETE' })
			);
		});

		it('propagates API error messages on failure', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: false,
					status: 400,
					json: async () => ({ message: 'Amount must be positive' })
				})
			);

			await expect(
				store.createTransaction({
					walletId: 'w-1',
					categoryId: 'c-1',
					amount: -10,
					type: 'expense',
					date: '2026-09-25'
				})
			).rejects.toThrow('Amount must be positive');
		});
	});

	describe('Server-Driven Queries & v1.13.0 API', () => {
		it('fetchTransactions sends structured query params and handles envelope', async () => {
			const fetchMock = vi.fn().mockImplementation((url: string) => {
				expect(url).toContain('/api/v1/transactions?');
				expect(url).toContain('envelope=true');
				expect(url).toContain('walletId=w1%2Cw2');
				expect(url).toContain('categoryId=c1');
				expect(url).toContain('type=expense');
				expect(url).toContain('status=planned');
				expect(url).toContain('q=kopi');
				expect(url).toContain('limit=25');
				expect(url).toContain('offset=50');
				return Promise.resolve({
					ok: true,
					json: async () => ({
						items: [{ transactionId: 't-1', transactionAmount: 50000 }],
						pagination: { total: 100, limit: 25, offset: 50, hasNext: true, totalPages: 4 }
					})
				});
			});
			vi.stubGlobal('fetch', fetchMock);

			const res = await store.fetchTransactions({
				walletId: ['w1', 'w2'],
				categoryId: 'c1',
				type: 'expense',
				status: 'planned',
				q: 'kopi',
				limit: 25,
				offset: 50
			});

			expect(res.items.length).toBe(1);
			expect(res.pagination.total).toBe(100);
			expect(res.pagination.hasNext).toBe(true);
		});

		it('fetchHorizonProjections constructs correct analytics URL', async () => {
			const fetchMock = vi.fn().mockImplementation((url: string) => {
				expect(url).toContain('/api/v1/analytics/horizon?');
				expect(url).toContain('periods=2026-09%2C2026-10');
				expect(url).toContain('months=3');
				return Promise.resolve({
					ok: true,
					json: async () => ({
						baseCurrency: 'IDR',
						generatedAt: new Date().toISOString(),
						startingNetWorth: { total: 100000, spendable: 50000, locked: 50000 },
						periods: []
					})
				});
			});
			vi.stubGlobal('fetch', fetchMock);

			const res = await store.fetchHorizonProjections(['2026-09', '2026-10'], 3);
			expect(res.baseCurrency).toBe('IDR');
		});

		it('fetchSnapshot passes startDate and endDate query params when provided', async () => {
			const fetchMock = vi.fn().mockImplementation((url: string) => {
				if (url.includes('/api/v1/account-detail')) {
					expect(url).toContain('startDate=2026-09-01');
					expect(url).toContain('endDate=2026-09-30');
					return Promise.resolve({
						ok: true,
						json: async () => ({
							netWorth: { consolidated: { total: 100 } },
							wallets: { spendable: { total: 50, items: [] }, locked: { total: 50, items: [] } }
						})
					});
				}
				return Promise.resolve({ ok: true, json: async () => [] });
			});
			vi.stubGlobal('fetch', fetchMock);

			await store.fetchSnapshot({ startDate: '2026-09-01', endDate: '2026-09-30' });
			expect(store.isLive).toBe(true);
		});

		it('fetchTransactionsForDrawer requests envelope and populates drawerTransactions', async () => {
			const fetchMock = vi.fn().mockImplementation((url: string) => {
				expect(url).toContain('/api/v1/transactions?');
				expect(url).toContain('envelope=true');
				expect(url).toContain('walletId=w-test');
				return Promise.resolve({
					ok: true,
					json: async () => ({
						items: [{ transactionId: 't-drawer-1', transactionAmount: 75000 }],
						pagination: { total: 1, limit: 50, offset: 0, hasNext: false, totalPages: 1 }
					})
				});
			});
			vi.stubGlobal('fetch', fetchMock);

			await store.fetchTransactionsForDrawer({ walletId: 'w-test', limit: 50 });
			expect(store.drawerTransactions.length).toBe(1);
			expect(store.drawerTransactions[0].transactionId).toBe('t-drawer-1');

			// Second call uses cache and does not re-fetch
			await store.fetchTransactionsForDrawer({ walletId: 'w-test', limit: 50 });
			expect(fetchMock).toHaveBeenCalledTimes(1);
		});

		it('fetchWallets queries /api/v1/wallets and updates activeWallets and lastTransaction', async () => {
			const fetchMock = vi.fn().mockImplementation((url: string) => {
				expect(url).toContain('/api/v1/wallets');
				return Promise.resolve({
					ok: true,
					json: async () => [
						{
							walletId: 'w-custom-1',
							walletName: 'BCA Private',
							walletInstitution: 'BCA',
							walletType: 'bank',
							walletBalance: 12500000,
							walletCurrency: 'IDR',
							walletIsLocked: 0,
							lastTransaction: {
								transactionId: 'tx-1',
								date: '2026-10-01T00:00:00.000Z',
								amount: 500000,
								description: 'Dividen',
								direction: 'in'
							}
						}
					]
				});
			});
			vi.stubGlobal('fetch', fetchMock);

			const wallets = await store.fetchWallets();
			expect(wallets.length).toBe(1);
			expect(wallets[0].walletName).toBe('BCA Private');
			expect(wallets[0].lastTransaction?.description).toBe('Dividen');
			expect(store.allWallets.length).toBe(1);
			expect(store.allWallets[0].walletId).toBe('w-custom-1');
		});

		it('fetchDebtsLoans queries /api/v1/debts-loans and categorizes debts and loans', async () => {
			const fetchMock = vi.fn().mockImplementation((url: string) => {
				expect(url).toContain('/api/v1/debts-loans');
				return Promise.resolve({
					ok: true,
					json: async () => [
						{
							debtLoanId: 'd-1',
							debtLoanPersonName: 'Bank Mandiri KPR',
							debtLoanAmount: 250000000,
							debtLoanRemainingAmount: 200000000,
							debtLoanType: 'debt',
							debtLoanStatus: 'partially_paid'
						},
						{
							debtLoanId: 'l-1',
							debtLoanPersonName: 'Teman Kantor',
							debtLoanAmount: 5000000,
							debtLoanRemainingAmount: 5000000,
							debtLoanType: 'loan',
							debtLoanStatus: 'unpaid'
						}
					]
				});
			});
			vi.stubGlobal('fetch', fetchMock);

			const { activeDebts, activeLoans } = await store.fetchDebtsLoans();
			expect(activeDebts.length).toBe(1);
			expect(activeDebts[0].personName).toBe('Bank Mandiri KPR');
			expect(activeLoans.length).toBe(1);
			expect(activeLoans[0].personName).toBe('Teman Kantor');
			expect(store.activeDebts.length).toBe(1);
			expect(store.activeLoans.length).toBe(1);
		});
	});
});
