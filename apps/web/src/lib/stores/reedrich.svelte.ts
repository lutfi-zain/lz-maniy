import { SvelteMap } from 'svelte/reactivity';
import {
	DEFAULT_API_URL,
	DEFAULT_TOKEN,
	MOCK_CATEGORIES,
	MOCK_SNAPSHOT
} from '$lib/stores/mock-data';
import { authStore } from '$lib/stores/auth.svelte';
import type {
	AccountDetail,
	ApplyRecurringTemplatePayload,
	BudgetSnapshot,
	CategoryRecord,
	ContributeGoalPayload,
	CreateBudgetPayload,
	CreateCategoryPayload,
	CreateGoalPayload,
	CreateRecurringTemplatePayload,
	CreateTransactionPayload,
	CreateTransferPayload,
	CreateWalletPayload,
	DrawerState,
	GoalSnapshot,
	RecurringTemplate,
	TransactionRecord,
	UpdateBudgetPayload,
	UpdateCategoryPayload,
	UpdateGoalPayload,
	UpdateProfilePayload,
	UpdateRecurringTemplatePayload,
	UpdateTransactionPayload,
	UpdateWalletPayload,
	UserProfileDTO,
	WalletItem
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

	// Recurring templates dataset
	recurringTemplates = $state<RecurringTemplate[]>([]);
	isRecurringLoading = $state<boolean>(false);
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
		this.recurringTemplates = [];
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
		try {
			const [accRes, catRes] = await Promise.all([
				this.request(`${DEFAULT_API_URL}/api/v1/account-detail`),
				this.request(`${DEFAULT_API_URL}/api/v1/categories`).catch(() => null),
				this.fetchUserProfile().catch(() => null)
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
	/**
	 * Queries GET /api/v1/me to retrieve sanitized verified user profile.
	 */
	async fetchUserProfile(): Promise<UserProfileDTO | null> {
		const token = (authStore.accessToken || this.apiToken).trim();
		if (!token) return null;

		try {
			const res = await this.request(`${DEFAULT_API_URL}/api/v1/me`);
			if (!res.ok) return null;
			const profile = (await res.json()) as UserProfileDTO;
			if (profile && profile.userId) {
				authStore.setUserProfile(profile);
			}
			return profile;
		} catch (err) {
			console.warn('Gagal memuat profil pengguna dari /api/v1/me:', err);
			return null;
		}
	}

	async fetchAllTransactions() {
		if (this.allTransactions.length > 0) return;
		this.isLedgerLoading = true;
		try {
			let offset = 0;
			const accumulated: TransactionRecord[] = [];
			while (true) {
				const res = await this.request(
					`${DEFAULT_API_URL}/api/v1/transactions?limit=200&offset=${offset}`
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

		try {
			const url = `${DEFAULT_API_URL}/api/v1/transactions?${queryParts.join('&')}`;
			const res = await this.request(url);
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
	async fetchRecurringTemplates(): Promise<RecurringTemplate[]> {
		this.isRecurringLoading = true;
		try {
			const res = await this.request(`${DEFAULT_API_URL}/api/v1/recurring-templates`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const json = await res.json();
			const items: RecurringTemplate[] = Array.isArray(json) ? json : (json.items ?? []);
			this.recurringTemplates = items;
			return items;
		} catch (err) {
			console.warn('Gagal memuat recurring templates:', err);
			return [];
		} finally {
			this.isRecurringLoading = false;
		}
	}
	private async request(url: string, init: RequestInit = {}): Promise<Response> {
		// Proactively refresh if near expiration
		if (authStore.accessToken && authStore.isExpiringSoon && authStore.refreshToken) {
			await authStore.refreshSession(DEFAULT_API_URL);
		}

		const currentToken = (authStore.accessToken || this.apiToken).trim();
		const headers = new Headers(init.headers || {});
		if (currentToken) {
			headers.set('X-API-Key', currentToken);
			headers.set('Authorization', `Bearer ${currentToken}`);
		}

		let res = await fetch(url, { ...init, headers });

		// On 401, attempt one refresh and retry
		if (res.status === 401 && authStore.refreshToken) {
			const refreshed = await authStore.refreshSession(DEFAULT_API_URL);
			if (refreshed && authStore.accessToken) {
				headers.set('X-API-Key', authStore.accessToken);
				headers.set('Authorization', `Bearer ${authStore.accessToken}`);
				res = await fetch(url, { ...init, headers });
			}
		}

		return res;
	}

	/**
	 * Invalidate transaction caches and refresh global snapshot and transaction list.
	 */
	private async invalidateAndRefresh(): Promise<void> {
		this.transactionCache.clear();
		this.allTransactions = [];
		await Promise.all([
			this.fetchSnapshot(),
			this.fetchAllTransactions(),
			this.fetchRecurringTemplates()
		]);
	}

	/**
	 * Create a new expense or income transaction.
	 */
	async createTransaction(payload: CreateTransactionPayload): Promise<TransactionRecord> {
		const res = await this.request(`${DEFAULT_API_URL}/api/v1/transactions`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});

		if (!res.ok) {
			const errData = await res.json().catch(() => ({}));
			throw new Error(errData.message || `Gagal mencatat transaksi (HTTP ${res.status})`);
		}

		const created = (await res.json()) as TransactionRecord;
		await this.invalidateAndRefresh();
		return created;
	}

	/**
	 * Transfer funds between two user wallets.
	 */
	async createTransfer(payload: CreateTransferPayload): Promise<TransactionRecord> {
		const res = await this.request(`${DEFAULT_API_URL}/api/v1/transfers`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});

		if (!res.ok) {
			const errData = await res.json().catch(() => ({}));
			throw new Error(errData.message || `Gagal melakukan transfer (HTTP ${res.status})`);
		}

		const created = (await res.json()) as TransactionRecord;
		await this.invalidateAndRefresh();
		return created;
	}

	/**
	 * Update an existing transaction by ID.
	 */
	async updateTransaction(id: string, delta: UpdateTransactionPayload): Promise<TransactionRecord> {
		const res = await this.request(
			`${DEFAULT_API_URL}/api/v1/transactions/${encodeURIComponent(id)}`,
			{
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(delta)
			}
		);

		if (!res.ok) {
			const errData = await res.json().catch(() => ({}));
			throw new Error(errData.message || `Gagal memperbarui transaksi (HTTP ${res.status})`);
		}

		const updated = (await res.json()) as TransactionRecord;
		await this.invalidateAndRefresh();
		return updated;
	}

	/**
	 * Permanently delete a transaction by ID.
	 */
	async deleteTransaction(id: string): Promise<void> {
		const res = await this.request(
			`${DEFAULT_API_URL}/api/v1/transactions/${encodeURIComponent(id)}`,
			{
				method: 'DELETE'
			}
		);

		if (!res.ok) {
			const errData = await res.json().catch(() => ({}));
			throw new Error(errData.message || `Gagal menghapus transaksi (HTTP ${res.status})`);
		}

		await this.invalidateAndRefresh();
	}
	// --- Wallets CRUD ---

	async createWallet(payload: CreateWalletPayload): Promise<WalletItem> {
		const res = await this.request(`${DEFAULT_API_URL}/api/v1/wallets`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});

		if (!res.ok) {
			const errData = await res.json().catch(() => ({}));
			throw new Error(errData.message || `Gagal membuat dompet (HTTP ${res.status})`);
		}

		const created = (await res.json()) as WalletItem;
		await this.invalidateAndRefresh();
		return created;
	}

	async updateWallet(id: string, delta: UpdateWalletPayload): Promise<WalletItem> {
		const res = await this.request(`${DEFAULT_API_URL}/api/v1/wallets/${encodeURIComponent(id)}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(delta)
		});

		if (!res.ok) {
			const errData = await res.json().catch(() => ({}));
			throw new Error(errData.message || `Gagal memperbarui dompet (HTTP ${res.status})`);
		}

		const updated = (await res.json()) as WalletItem;
		await this.invalidateAndRefresh();
		return updated;
	}

	async deleteWallet(id: string): Promise<void> {
		const res = await this.request(`${DEFAULT_API_URL}/api/v1/wallets/${encodeURIComponent(id)}`, {
			method: 'DELETE'
		});

		if (!res.ok) {
			const errData = await res.json().catch(() => ({}));
			throw new Error(errData.message || `Gagal menghapus dompet (HTTP ${res.status})`);
		}

		await this.invalidateAndRefresh();
	}

	// --- Categories CRUD ---

	async createCategory(payload: CreateCategoryPayload): Promise<CategoryRecord> {
		const res = await this.request(`${DEFAULT_API_URL}/api/v1/categories`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});

		if (!res.ok) {
			const errData = await res.json().catch(() => ({}));
			throw new Error(errData.message || `Gagal membuat kategori (HTTP ${res.status})`);
		}

		const created = (await res.json()) as CategoryRecord;
		await this.invalidateAndRefresh();
		return created;
	}

	async updateCategory(id: string, delta: UpdateCategoryPayload): Promise<CategoryRecord> {
		const res = await this.request(
			`${DEFAULT_API_URL}/api/v1/categories/${encodeURIComponent(id)}`,
			{
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(delta)
			}
		);

		if (!res.ok) {
			const errData = await res.json().catch(() => ({}));
			throw new Error(errData.message || `Gagal memperbarui kategori (HTTP ${res.status})`);
		}

		const updated = (await res.json()) as CategoryRecord;
		await this.invalidateAndRefresh();
		return updated;
	}

	async deleteCategory(id: string): Promise<void> {
		const targetCat = this.categories.find((c) => c.categoryId === id);
		if (targetCat && targetCat.categoryName.toLowerCase() === 'adjustment') {
			throw new Error('Kategori sistem "Adjustment" dilindungi dan tidak dapat dihapus.');
		}
		const res = await this.request(
			`${DEFAULT_API_URL}/api/v1/categories/${encodeURIComponent(id)}`,
			{
				method: 'DELETE'
			}
		);

		if (!res.ok) {
			const errData = await res.json().catch(() => ({}));
			throw new Error(errData.message || `Gagal menghapus kategori (HTTP ${res.status})`);
		}

		await this.invalidateAndRefresh();
	}

	// --- Budgets CRUD ---

	async createBudget(payload: CreateBudgetPayload): Promise<BudgetSnapshot> {
		const res = await this.request(`${DEFAULT_API_URL}/api/v1/budgets`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});

		if (!res.ok) {
			const errData = await res.json().catch(() => ({}));
			throw new Error(errData.message || `Gagal membuat budget (HTTP ${res.status})`);
		}

		const created = (await res.json()) as BudgetSnapshot;
		await this.invalidateAndRefresh();
		return created;
	}

	async updateBudget(id: string, delta: UpdateBudgetPayload): Promise<BudgetSnapshot> {
		const res = await this.request(`${DEFAULT_API_URL}/api/v1/budgets/${encodeURIComponent(id)}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(delta)
		});

		if (!res.ok) {
			const errData = await res.json().catch(() => ({}));
			throw new Error(errData.message || `Gagal memperbarui budget (HTTP ${res.status})`);
		}

		const updated = (await res.json()) as BudgetSnapshot;
		await this.invalidateAndRefresh();
		return updated;
	}

	async deleteBudget(id: string): Promise<void> {
		const res = await this.request(`${DEFAULT_API_URL}/api/v1/budgets/${encodeURIComponent(id)}`, {
			method: 'DELETE'
		});

		if (!res.ok) {
			const errData = await res.json().catch(() => ({}));
			throw new Error(errData.message || `Gagal menghapus budget (HTTP ${res.status})`);
		}

		await this.invalidateAndRefresh();
	}

	// --- Goals CRUD ---

	async createGoal(payload: CreateGoalPayload): Promise<GoalSnapshot> {
		const res = await this.request(`${DEFAULT_API_URL}/api/v1/goals`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});

		if (!res.ok) {
			const errData = await res.json().catch(() => ({}));
			throw new Error(errData.message || `Gagal membuat target (HTTP ${res.status})`);
		}

		const created = (await res.json()) as GoalSnapshot;
		await this.invalidateAndRefresh();
		return created;
	}

	async updateGoal(id: string, delta: UpdateGoalPayload): Promise<GoalSnapshot> {
		const res = await this.request(`${DEFAULT_API_URL}/api/v1/goals/${encodeURIComponent(id)}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(delta)
		});

		if (!res.ok) {
			const errData = await res.json().catch(() => ({}));
			throw new Error(errData.message || `Gagal memperbarui target (HTTP ${res.status})`);
		}

		const updated = (await res.json()) as GoalSnapshot;
		await this.invalidateAndRefresh();
		return updated;
	}

	async deleteGoal(id: string): Promise<void> {
		const res = await this.request(`${DEFAULT_API_URL}/api/v1/goals/${encodeURIComponent(id)}`, {
			method: 'DELETE'
		});

		if (!res.ok) {
			const errData = await res.json().catch(() => ({}));
			throw new Error(errData.message || `Gagal menghapus target (HTTP ${res.status})`);
		}

		await this.invalidateAndRefresh();
	}

	async contributeToGoal(id: string, payload: ContributeGoalPayload): Promise<GoalSnapshot> {
		const res = await this.request(
			`${DEFAULT_API_URL}/api/v1/goals/${encodeURIComponent(id)}/contribute`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			}
		);

		if (!res.ok) {
			const errData = await res.json().catch(() => ({}));
			throw new Error(errData.message || `Gagal menyetor ke target (HTTP ${res.status})`);
		}

		const updated = (await res.json()) as GoalSnapshot;
		await this.invalidateAndRefresh();
		return updated;
	}

	async linkGoalWallet(goalId: string, walletId: string): Promise<void> {
		const res = await this.request(
			`${DEFAULT_API_URL}/api/v1/goals/${encodeURIComponent(goalId)}/wallets`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ walletId })
			}
		);

		if (!res.ok) {
			const errData = await res.json().catch(() => ({}));
			throw new Error(
				errData.message || `Gagal menghubungkan dompet ke target (HTTP ${res.status})`
			);
		}

		await this.invalidateAndRefresh();
	}

	async unlinkGoalWallet(goalId: string, walletId: string): Promise<void> {
		const res = await this.request(
			`${DEFAULT_API_URL}/api/v1/goals/${encodeURIComponent(goalId)}/wallets/${encodeURIComponent(walletId)}`,
			{
				method: 'DELETE'
			}
		);

		if (!res.ok) {
			const errData = await res.json().catch(() => ({}));
			throw new Error(
				errData.message || `Gagal memutuskan dompet dari target (HTTP ${res.status})`
			);
		}

		await this.invalidateAndRefresh();
	}

	// --- Recurring Templates CRUD ---

	async createRecurringTemplate(
		payload: CreateRecurringTemplatePayload
	): Promise<RecurringTemplate> {
		const res = await this.request(`${DEFAULT_API_URL}/api/v1/recurring-templates`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});

		if (!res.ok) {
			const errData = await res.json().catch(() => ({}));
			throw new Error(errData.message || `Gagal membuat recurring template (HTTP ${res.status})`);
		}

		const created = (await res.json()) as RecurringTemplate;
		await this.invalidateAndRefresh();
		return created;
	}

	async updateRecurringTemplate(
		id: string,
		delta: UpdateRecurringTemplatePayload
	): Promise<RecurringTemplate> {
		const res = await this.request(
			`${DEFAULT_API_URL}/api/v1/recurring-templates/${encodeURIComponent(id)}`,
			{
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(delta)
			}
		);

		if (!res.ok) {
			const errData = await res.json().catch(() => ({}));
			throw new Error(
				errData.message || `Gagal memperbarui recurring template (HTTP ${res.status})`
			);
		}

		const updated = (await res.json()) as RecurringTemplate;
		await this.invalidateAndRefresh();
		return updated;
	}

	async deleteRecurringTemplate(id: string): Promise<void> {
		const res = await this.request(
			`${DEFAULT_API_URL}/api/v1/recurring-templates/${encodeURIComponent(id)}`,
			{
				method: 'DELETE'
			}
		);

		if (!res.ok) {
			const errData = await res.json().catch(() => ({}));
			throw new Error(
				errData.message || `Gagal menghapus recurring template (HTTP ${res.status})`
			);
		}

		await this.invalidateAndRefresh();
	}

	async applyRecurringTemplate(
		id: string,
		payload?: ApplyRecurringTemplatePayload
	): Promise<TransactionRecord> {
		const res = await this.request(
			`${DEFAULT_API_URL}/api/v1/recurring-templates/${encodeURIComponent(id)}/apply`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload || {})
			}
		);

		if (!res.ok) {
			const errData = await res.json().catch(() => ({}));
			throw new Error(
				errData.message || `Gagal menerapkan recurring template (HTTP ${res.status})`
			);
		}

		const json = await res.json();
		const txn = (json.transaction ?? json) as TransactionRecord;
		await this.invalidateAndRefresh();
		return txn;
	}

	// --- Profile Update ---

	async updateProfile(delta: UpdateProfilePayload): Promise<UserProfileDTO> {
		const res = await this.request(`${DEFAULT_API_URL}/api/v1/me`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(delta)
		});

		if (!res.ok) {
			const errData = await res.json().catch(() => ({}));
			throw new Error(errData.message || `Gagal memperbarui profil (HTTP ${res.status})`);
		}

		const profile = (await res.json()) as UserProfileDTO;
		if (profile && profile.userId) {
			authStore.setUserProfile(profile);
		}
		return profile;
	}

	reset() {
		this.snapshot = null;
		this.categories = [];
		this.allTransactions = [];
		this.recurringTemplates = [];
		this.transactionCache.clear();
		this.loadMock();
		this.isLive = false;
		this.statusMessage = 'Sesi di-reset. Menggunakan data cache mock.';
	}
}

export const reedrichStore = new ReedrichStore(true);
