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
	WalletItem,
	TransactionEnvelope,
	TransactionQueryParams,
	HorizonBoardDTO
} from '$lib/types/account-detail';
import { globalConcurrencyPool } from '$lib/utils/concurrency-pool';

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

	async fetchSnapshot(dates?: { startDate?: string; endDate?: string }, customToken?: string) {
		const token = (customToken ?? this.apiToken).trim();
		if (token) this.apiToken = token;

		this.isLoading = true;
		this.statusMessage = 'Menghubungi API Reedrich account-detail...';
		try {
			const dateQuery =
				dates?.startDate && dates?.endDate
					? `?startDate=${encodeURIComponent(dates.startDate)}&endDate=${encodeURIComponent(dates.endDate)}`
					: '';
			const [accRes, catRes] = await Promise.all([
				this.request(`${DEFAULT_API_URL}/api/v1/account-detail${dateQuery}`),
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

	/**
	 * Parameterized server-driven transaction query engine (Reedrich v1.13.0).
	 * Queries /api/v1/transactions with ?envelope=true and structured filters.
	 */
	async fetchTransactions(
		params: TransactionQueryParams = {},
		signal?: AbortSignal
	): Promise<TransactionEnvelope> {
		return globalConcurrencyPool.run(async (taskSignal) => {
			const queryParts: string[] = ['envelope=true'];

			if (params.walletId) {
				const val = Array.isArray(params.walletId)
					? params.walletId.filter(Boolean).join(',')
					: params.walletId;
				if (val) queryParts.push(`walletId=${encodeURIComponent(val)}`);
			}
			if (params.targetWalletId) {
				const val = Array.isArray(params.targetWalletId)
					? params.targetWalletId.filter(Boolean).join(',')
					: params.targetWalletId;
				if (val) queryParts.push(`targetWalletId=${encodeURIComponent(val)}`);
			}
			if (params.categoryId) {
				const val = Array.isArray(params.categoryId)
					? params.categoryId.filter(Boolean).join(',')
					: params.categoryId;
				if (val) queryParts.push(`categoryId=${encodeURIComponent(val)}`);
			}
			if (params.budgetId) {
				const val = Array.isArray(params.budgetId)
					? params.budgetId.filter(Boolean).join(',')
					: params.budgetId;
				if (val) queryParts.push(`budgetId=${encodeURIComponent(val)}`);
			}
			if (params.type && params.type !== 'all') {
				queryParts.push(`type=${encodeURIComponent(params.type)}`);
			}
			if (params.status && params.status !== 'all') {
				queryParts.push(`status=${encodeURIComponent(params.status)}`);
			} else if (params.isPlanned !== undefined) {
				queryParts.push(`isPlanned=${params.isPlanned}`);
			}
			if (params.q || params.search) {
				const qVal = (params.q || params.search || '').trim();
				if (qVal) queryParts.push(`q=${encodeURIComponent(qVal)}`);
			}
			if (params.startDate) {
				queryParts.push(`startDate=${encodeURIComponent(params.startDate)}`);
			}
			if (params.endDate) {
				queryParts.push(`endDate=${encodeURIComponent(params.endDate)}`);
			}
			if (params.limit !== undefined) {
				queryParts.push(`limit=${params.limit}`);
			}
			if (params.offset !== undefined) {
				queryParts.push(`offset=${params.offset}`);
			}

			const url = `${DEFAULT_API_URL}/api/v1/transactions?${queryParts.join('&')}`;
			const res = await this.request(url, { signal: taskSignal || signal });
			if (!res.ok) {
				throw new Error(`HTTP ${res.status}`);
			}

			const data = await res.json();
			if (data && 'items' in data && 'pagination' in data) {
				return data as TransactionEnvelope;
			}
			const items: TransactionRecord[] = Array.isArray(data) ? data : [];
			const totalHeader = res.headers?.get('x-total-count');
			const total = totalHeader ? parseInt(totalHeader, 10) : items.length;
			const limit = params.limit ?? 50;
			const offset = params.offset ?? 0;
			return {
				items,
				pagination: {
					total,
					limit,
					offset,
					hasNext: offset + items.length < total,
					totalPages: Math.max(1, Math.ceil(total / limit))
				}
			};
		}, signal);
	}

	/**
	 * Multi-Period Horizon Projections Engine (Reedrich v1.13.0).
	 * Queries /api/v1/analytics/horizon with single-pass roll-forward calculations.
	 */
	async fetchHorizonProjections(
		periods?: string[],
		months?: number,
		signal?: AbortSignal
	): Promise<HorizonBoardDTO> {
		return globalConcurrencyPool.run(async (taskSignal) => {
			const queryParts: string[] = ['baseCurrency=IDR'];
			if (periods && periods.length > 0) {
				queryParts.push(`periods=${encodeURIComponent(periods.join(','))}`);
			}
			if (months !== undefined) {
				queryParts.push(`months=${months}`);
			}
			const url = `${DEFAULT_API_URL}/api/v1/analytics/horizon?${queryParts.join('&')}`;
			const res = await this.request(url, { signal: taskSignal || signal });
			if (!res.ok) {
				throw new Error(`HTTP ${res.status}`);
			}
			return (await res.json()) as HorizonBoardDTO;
		}, signal);
	}
	async fetchTransactionsForDrawer(param: {
		walletId?: string;
		categoryId?: string;
		budgetId?: string;
		startDate?: string;
		endDate?: string;
		limit?: number;
	}) {
		this.isDrawerLoading = true;
		const limit = param.limit ?? 50;

		// If allTransactions is already loaded in memory, filter instantly!
		if (this.allTransactions.length > 0) {
			const matches = this.allTransactions.filter((t) => {
				if (
					param.walletId &&
					t.transactionWalletId !== param.walletId &&
					t.transactionTargetWalletId !== param.walletId
				) {
					return false;
				}
				if (param.categoryId && t.transactionCategoryId !== param.categoryId) {
					return false;
				}
				if (param.budgetId && t.transactionBudgetId !== param.budgetId) {
					return false;
				}
				const d = (t.transactionDate || '').slice(0, 10);
				if (param.startDate && d < param.startDate) return false;
				if (param.endDate && d > param.endDate) return false;
				return true;
			});
			this.drawerTransactions = matches.slice(0, limit);
			this.isDrawerLoading = false;
			return;
		}

		const queryParts: string[] = [`limit=${limit}`];

		if (param.walletId) queryParts.push(`walletId=${encodeURIComponent(param.walletId)}`);
		if (param.categoryId) queryParts.push(`categoryId=${encodeURIComponent(param.categoryId)}`);
		if (param.budgetId) queryParts.push(`budgetId=${encodeURIComponent(param.budgetId)}`);
		if (param.startDate) queryParts.push(`startDate=${encodeURIComponent(param.startDate)}`);
		if (param.endDate) queryParts.push(`endDate=${encodeURIComponent(param.endDate)}`);

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
			console.warn('Gagal memuat transaksi untuk drawer:', err);
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
	/**
	 * Standalone fetch of single goal by ID.
	 */
	async fetchGoalById(goalId: string): Promise<GoalSnapshot> {
		const res = await this.request(`${DEFAULT_API_URL}/api/v1/goals/${encodeURIComponent(goalId)}`);
		if (!res.ok) {
			const errData = await res.json().catch(() => ({}));
			throw new Error(errData.message || `Gagal memuat target (HTTP ${res.status})`);
		}
		const data = await res.json();
		return {
			goalId: data.goalId,
			goalName: data.goalName,
			targetAmount: data.goalTargetAmount ?? data.targetAmount,
			currentAmount: data.goalCurrentAmount ?? data.currentAmount ?? 0,
			currency: data.goalCurrency ?? data.currency ?? 'IDR',
			targetDate: data.goalTargetDate ?? data.targetDate ?? null,
			categoryId: data.goalCategoryId ?? data.categoryId ?? null,
			notes: data.goalNotes ?? data.notes ?? null,
			status: data.goalStatus ?? data.status ?? 'in_progress',
			progressPercentage: data.pacing?.progressPercentage ?? data.progressPercentage ?? 0,
			isDerived:
				data.isDerived ??
				(data.linkedWallets?.length ?? data.linkedWalletsBreakdown?.length ?? 0) > 0,
			daysRemaining: data.pacing?.daysRemaining ?? data.daysRemaining ?? null,
			pacing: data.pacing,
			linkedWalletsBreakdown: data.linkedWallets ?? data.linkedWalletsBreakdown ?? []
		};
	}

	/**
	 * Standalone fetch of all goals, with optional status filter.
	 */
	async fetchGoals(status?: 'in_progress' | 'completed' | 'cancelled'): Promise<GoalSnapshot[]> {
		const query = status ? `?status=${encodeURIComponent(status)}` : '';
		const res = await this.request(`${DEFAULT_API_URL}/api/v1/goals${query}`);
		if (!res.ok) {
			const errData = await res.json().catch(() => ({}));
			throw new Error(errData.message || `Gagal memuat daftar target (HTTP ${res.status})`);
		}
		const json = (await res.json()) as Record<string, unknown>;
		const itemsRaw = (
			Array.isArray(json) ? json : ((json.items ?? json.data ?? []) as unknown[])
		) as Array<Record<string, unknown>>;
		const items: GoalSnapshot[] = itemsRaw.map((data) => {
			const pacing = data.pacing as Record<string, unknown> | undefined;
			const linked = (data.linkedWallets ?? data.linkedWalletsBreakdown) as
				Array<Record<string, unknown>> | undefined;
			return {
				goalId: String(data.goalId),
				goalName: String(data.goalName),
				targetAmount: Number(data.goalTargetAmount ?? data.targetAmount),
				currentAmount: Number(data.goalCurrentAmount ?? data.currentAmount ?? 0),
				currency: String(data.goalCurrency ?? data.currency ?? 'IDR'),
				targetDate: data.goalTargetDate
					? String(data.goalTargetDate)
					: data.targetDate
						? String(data.targetDate)
						: null,
				categoryId: data.goalCategoryId
					? String(data.goalCategoryId)
					: data.categoryId
						? String(data.categoryId)
						: null,
				notes: data.goalNotes ? String(data.goalNotes) : data.notes ? String(data.notes) : null,
				status: (data.goalStatus ?? data.status ?? 'in_progress') as
					'in_progress' | 'completed' | 'cancelled',
				progressPercentage: Number(pacing?.progressPercentage ?? data.progressPercentage ?? 0),
				isDerived: Boolean(data.isDerived ?? (linked?.length ?? 0) > 0),
				daysRemaining:
					pacing?.daysRemaining !== undefined && pacing.daysRemaining !== null
						? Number(pacing.daysRemaining)
						: data.daysRemaining !== undefined && data.daysRemaining !== null
							? Number(data.daysRemaining)
							: null,
				pacing: pacing as GoalSnapshot['pacing'],
				linkedWalletsBreakdown: linked as GoalSnapshot['linkedWalletsBreakdown']
			};
		});
		if (this.snapshot && !status) {
			this.snapshot.goals = items;
		}
		return items;
	}

	/**
	 * Standalone fetch of single budget by ID.
	 */
	async fetchBudgetById(budgetId: string): Promise<BudgetSnapshot> {
		const res = await this.request(
			`${DEFAULT_API_URL}/api/v1/budgets/${encodeURIComponent(budgetId)}`
		);
		if (!res.ok) {
			const errData = await res.json().catch(() => ({}));
			throw new Error(errData.message || `Gagal memuat pagu anggaran (HTTP ${res.status})`);
		}
		const json = await res.json();
		const b = json.budget ?? json;
		const spent = json.spent ?? b.spent ?? 0;
		const amount = b.budgetAmount ?? b.amount ?? 0;
		const remaining = json.remaining ?? b.remaining ?? amount - spent;
		const percentUsed =
			json.percentUsed ?? b.percentUsed ?? (amount > 0 ? Math.round((spent / amount) * 100) : 0);

		return {
			budgetId: b.budgetId,
			budgetName: b.budgetName,
			categoryId: b.budgetCategoryId ?? b.categoryId ?? null,
			categoryName: b.categoryName,
			amount,
			periodStart: b.budgetPeriodStart ?? b.periodStart,
			periodEnd: b.budgetPeriodEnd ?? b.periodEnd,
			notes: b.budgetNotes ?? b.notes ?? null,
			spent,
			remaining,
			percentUsed,
			status: b.status
		};
	}

	/**
	 * Standalone fetch of all budgets.
	 */
	async fetchBudgets(): Promise<BudgetSnapshot[]> {
		const res = await this.request(`${DEFAULT_API_URL}/api/v1/budgets`);
		if (!res.ok) {
			const errData = await res.json().catch(() => ({}));
			throw new Error(errData.message || `Gagal memuat daftar anggaran (HTTP ${res.status})`);
		}
		const json = (await res.json()) as Record<string, unknown>;
		const itemsRaw = (
			Array.isArray(json) ? json : ((json.items ?? json.data ?? []) as unknown[])
		) as Array<Record<string, unknown>>;
		const items: BudgetSnapshot[] = itemsRaw.map((entry) => {
			const b = (entry.budget ?? entry) as Record<string, unknown>;
			const spent = Number(entry.spent ?? b.spent ?? 0);
			const amount = Number(b.budgetAmount ?? b.amount ?? 0);
			const remaining = Number(entry.remaining ?? b.remaining ?? amount - spent);
			const percentUsed = Number(
				entry.percentUsed ?? b.percentUsed ?? (amount > 0 ? Math.round((spent / amount) * 100) : 0)
			);

			return {
				budgetId: String(b.budgetId),
				budgetName: String(b.budgetName),
				categoryId: b.budgetCategoryId
					? String(b.budgetCategoryId)
					: b.categoryId
						? String(b.categoryId)
						: null,
				categoryName: b.categoryName ? String(b.categoryName) : undefined,
				amount,
				periodStart: b.budgetPeriodStart
					? String(b.budgetPeriodStart)
					: b.periodStart
						? String(b.periodStart)
						: undefined,
				periodEnd: b.budgetPeriodEnd
					? String(b.budgetPeriodEnd)
					: b.periodEnd
						? String(b.periodEnd)
						: undefined,
				notes: b.budgetNotes ? String(b.budgetNotes) : b.notes ? String(b.notes) : null,
				spent,
				remaining,
				percentUsed,
				status: b.status as BudgetSnapshot['status']
			};
		});

		if (this.snapshot) {
			this.snapshot.budgets = items;
		}
		return items;
	}

	/**
	 * Standalone fetch of single wallet by ID.
	 */
	async fetchWalletById(walletId: string): Promise<WalletItem> {
		const res = await this.request(
			`${DEFAULT_API_URL}/api/v1/wallets/${encodeURIComponent(walletId)}`
		);
		if (!res.ok) {
			const errData = await res.json().catch(() => ({}));
			throw new Error(errData.message || `Gagal memuat dompet (HTTP ${res.status})`);
		}
		const json = await res.json();
		return {
			walletId: json.walletId,
			walletName: json.walletName,
			institution: json.walletInstitution ?? json.institution ?? 'General',
			type: json.walletType ?? json.type ?? 'bank',
			balance: json.walletBalance ?? json.balance ?? 0,
			currency: json.walletCurrency ?? json.currency ?? 'IDR',
			isLocked: json.walletIsLocked ?? json.isLocked ?? 0,
			lastTransaction: json.lastTransaction ?? null
		};
	}

	/**
	 * Standalone fetch of single transaction by ID.
	 */
	async fetchTransactionById(transactionId: string): Promise<TransactionRecord> {
		const res = await this.request(
			`${DEFAULT_API_URL}/api/v1/transactions/${encodeURIComponent(transactionId)}`
		);
		if (!res.ok) {
			const errData = await res.json().catch(() => ({}));
			throw new Error(errData.message || `Gagal memuat transaksi (HTTP ${res.status})`);
		}
		const json = await res.json();
		return {
			transactionId: json.transactionId,
			transactionUserId: json.transactionUserId,
			transactionWalletId: json.transactionWalletId,
			transactionTargetWalletId: json.transactionTargetWalletId ?? null,
			transactionCategoryId: json.transactionCategoryId ?? null,
			transactionBudgetId: json.transactionBudgetId ?? null,
			transactionAmount: json.transactionAmount,
			transactionAdminFee: json.transactionAdminFee ?? 0,
			transactionType: json.transactionType,
			transactionDescription: json.transactionDescription ?? null,
			transactionIsPlanned: json.transactionIsPlanned ?? 0,
			transactionOccurrenceDate: json.transactionOccurrenceDate ?? null,
			transactionRealizedAt: json.transactionRealizedAt ?? null,
			transactionPlannedAmount: json.transactionPlannedAmount ?? null,
			transactionTemplateId: json.transactionTemplateId ?? null,
			transactionDate: json.transactionDate,
			transactionCreatedAt: json.transactionCreatedAt
		};
	}

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
			throw new Error(errData.message || `Gagal menghapus recurring template (HTTP ${res.status})`);
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
