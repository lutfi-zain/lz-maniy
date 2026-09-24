import { SvelteMap } from 'svelte/reactivity';
import {
	DEFAULT_API_URL,
	DEFAULT_TOKEN,
	MOCK_CATEGORIES,
	MOCK_SNAPSHOT
} from '$lib/stores/mock-data';
import type {
	AccountDetail,
	CategoryRecord,
	DrawerState,
	TransactionRecord
} from '$lib/types/account-detail';

export class ReedrichStore {
	snapshot = $state<AccountDetail | null>(null);
	categories = $state<CategoryRecord[]>([]);
	apiToken = $state<string>(DEFAULT_TOKEN);
	isLive = $state<boolean>(false);
	isLoading = $state<boolean>(false);
	statusMessage = $state<string>('Siap.');
	activeTab = $state<'all' | 'spendable' | 'locked'>('all');
	selectedInstitution = $state<string | null>(null);

	// Drawer state
	activeDrawer = $state<DrawerState | null>(null);
	drawerTransactions = $state<TransactionRecord[]>([]);
	isDrawerLoading = $state<boolean>(false);
	drawerSearch = $state<string>('');

	// Ledger full dataset
	allTransactions = $state<TransactionRecord[]>([]);
	isLedgerLoading = $state<boolean>(false);
	// Cache to avoid refetching identical entity queries
	private transactionCache = new SvelteMap<string, TransactionRecord[]>();

	// Derived values
	spendableWallets = $derived(this.snapshot?.wallets.spendable.items ?? []);
	lockedWallets = $derived(this.snapshot?.wallets.locked.items ?? []);
	allWallets = $derived([...this.spendableWallets, ...this.lockedWallets]);

	filteredWallets = $derived.by(() => {
		let list =
			this.activeTab === 'spendable'
				? this.spendableWallets
				: this.activeTab === 'locked'
					? this.lockedWallets
					: this.allWallets;

		if (this.selectedInstitution) {
			list = list.filter((w) => w.institution === this.selectedInstitution);
		}

		return list;
	});

	filteredDrawerTransactions = $derived.by(() => {
		const q = this.drawerSearch.trim().toLowerCase();
		if (!q) return this.drawerTransactions;
		return this.drawerTransactions.filter(
			(t) =>
				(t.transactionDescription || '').toLowerCase().includes(q) ||
				(t.transactionType || '').toLowerCase().includes(q)
		);
	});

	activeBudgets = $derived(this.snapshot?.budgets ?? []);
	activeGoals = $derived(this.snapshot?.goals ?? []);
	activeDebts = $derived(this.snapshot?.obligations?.activeDebts ?? []);
	activeLoans = $derived(this.snapshot?.obligations?.activeLoans ?? []);

	constructor(autoInit = false) {
		if (autoInit) {
			this.loadMock();
		}
	}

	loadMock() {
		this.snapshot = MOCK_SNAPSHOT;
		this.categories = MOCK_CATEGORIES;
		this.isLive = false;
		this.isLoading = false;
		this.statusMessage = 'Memakai data snapshot mock.';
	}

	setTab(tab: 'all' | 'spendable' | 'locked') {
		this.activeTab = tab;
	}

	filterByInstitution(inst: string | null) {
		if (this.selectedInstitution === inst) {
			this.selectedInstitution = null;
		} else {
			this.selectedInstitution = inst;
		}
	}

	openDrawer(drawer: DrawerState) {
		this.activeDrawer = drawer;
		this.drawerSearch = '';
		this.drawerTransactions = [];
	}

	closeDrawer() {
		this.activeDrawer = null;
		this.drawerSearch = '';
		this.drawerTransactions = [];
	}

	async fetchSnapshot(customToken?: string) {
		const token = (customToken ?? this.apiToken).trim();
		if (token) this.apiToken = token;

		this.isLoading = true;
		this.statusMessage = 'Menghubungi API Reedrich account-detail...';

		const headers: Record<string, string> = {
			'X-API-Key': this.apiToken,
			Authorization: 'Bearer ' + this.apiToken
		};

		try {
			const [accRes, catRes] = await Promise.all([
				fetch(`${DEFAULT_API_URL}/api/v1/account-detail`, { headers }),
				fetch(`${DEFAULT_API_URL}/api/v1/categories`, { headers }).catch(() => null)
			]);

			if (!accRes.ok) throw new Error(`HTTP ${accRes.status}`);

			const accData = (await accRes.json()) as AccountDetail;
			this.snapshot = accData;

			if (catRes && catRes.ok) {
				this.categories = (await catRes.json()) as CategoryRecord[];
			}

			this.isLive = true;
			this.statusMessage = 'Snapshot mutakhir berhasil dimuat dari API.';
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			console.warn('API fetch failed, falling back to mock:', msg);
			this.loadMock();
			this.statusMessage = `Offline / Gagal (${msg}). Memakai data cache mock.`;
		} finally {
			this.isLoading = false;
		}
	}

	async fetchAllTransactions() {
		if (this.allTransactions.length > 0) return;
		this.isLedgerLoading = true;
		const headers: Record<string, string> = {
			'X-API-Key': this.apiToken,
			Authorization: 'Bearer ' + this.apiToken
		};
		try {
			let offset = 0;
			const accumulated: TransactionRecord[] = [];
			while (true) {
				const res = await fetch(
					`${DEFAULT_API_URL}/api/v1/transactions?limit=200&offset=${offset}`,
					{ headers }
				);
				if (!res.ok) break;
				const data = await res.json();
				const items: TransactionRecord[] = Array.isArray(data) ? data : (data.items ?? []);
				accumulated.push(...items);
				if (items.length < 200) break;
				offset += 200;
			}
			if (accumulated.length > 0) {
				this.allTransactions = accumulated;
			}
		} catch (e) {
			console.warn('Gagal memuat seluruh transaksi:', e);
		} finally {
			this.isLedgerLoading = false;
		}
	}
	async fetchTransactionsForDrawer(param: {
		walletId?: string;
		categoryId?: string;
		budgetId?: string;
		limit?: number;
	}) {
		this.isDrawerLoading = true;
		const limit = param.limit ?? 50;
		const queryParts: string[] = [`limit=${limit}`];

		if (param.walletId) queryParts.push(`walletId=${encodeURIComponent(param.walletId)}`);
		if (param.categoryId) queryParts.push(`categoryId=${encodeURIComponent(param.categoryId)}`);
		if (param.budgetId) queryParts.push(`budgetId=${encodeURIComponent(param.budgetId)}`);

		const cacheKey = queryParts.join('&');
		if (this.transactionCache.has(cacheKey)) {
			this.drawerTransactions = this.transactionCache.get(cacheKey)!;
			this.isDrawerLoading = false;
			return;
		}

		const headers: Record<string, string> = {
			'X-API-Key': this.apiToken,
			Authorization: 'Bearer ' + this.apiToken
		};

		try {
			const url = `${DEFAULT_API_URL}/api/v1/transactions?${queryParts.join('&')}`;
			const res = await fetch(url, { headers });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);

			const json = await res.json();
			const items: TransactionRecord[] = Array.isArray(json)
				? json
				: (json.items ?? json.data ?? []);

			this.transactionCache.set(cacheKey, items);
			this.drawerTransactions = items;
		} catch (err) {
			console.warn('Gagal memuat transaksi detail:', err);
			this.drawerTransactions = [];
		} finally {
			this.isDrawerLoading = false;
		}
	}
}

export const reedrichStore = new ReedrichStore(true);
