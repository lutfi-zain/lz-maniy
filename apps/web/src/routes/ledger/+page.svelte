<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { page } from '$app/state';
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { fmtIDR, fmtCurrency, getConvertedBalanceInIDR } from '$lib/utils/currency';
	import { dFmt } from '$lib/utils/dates';
	import Table from 'phosphor-svelte/lib/Table';
	import MagnifyingGlass from 'phosphor-svelte/lib/MagnifyingGlass';
	import ArrowLeft from 'phosphor-svelte/lib/ArrowLeft';
	import ArrowRight from 'phosphor-svelte/lib/ArrowRight';
	import X from 'phosphor-svelte/lib/X';
	import Plus from 'phosphor-svelte/lib/Plus';
	import { transactionFormStore } from '$lib/stores/transaction-form.svelte';
	import DateRangePicker from '$lib/components/ui/DateRangePicker.svelte';
	import ComboboxMultiSelect, {
		type ComboboxOption
	} from '$lib/components/ui/ComboboxMultiSelect.svelte';
	import { calculatePointInTimeNetWorth } from '$lib/utils/networth-timeline';
	import { dateFilterStore, type DatePreset } from '$lib/stores/date-filter.svelte';
	import { matchesBudgetFilter } from '$lib/utils/budget-filter';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte.js';
	import ViewModeSwitcher from '$lib/components/ledger/ViewModeSwitcher.svelte';
	import HorizonBoard from '$lib/components/ledger/HorizonBoard.svelte';
	import type { GlobalFilters } from '$lib/components/ledger/HorizonPeriodColumn.svelte';
	// Filters
	let selectedWalletIds = $state<string[]>([]);
	let selectedCategoryIds = $state<string[]>([]);
	let selectedBudgetIds = $state<string[]>([]);
	let budgetFilterName = $state<string>('');
	let selectedType = $state<'all' | 'expense' | 'income' | 'transfer'>('all');
	let selectedStatus = $state<'all' | 'realized' | 'planned'>('all');
	let searchKeyword = $state<string>('');

	const globalFilters = $derived<GlobalFilters>({
		walletIds: selectedWalletIds,
		categoryIds: selectedCategoryIds,
		budgetIds: selectedBudgetIds,
		type: selectedType,
		status: selectedStatus,
		searchKeyword
	});

	// Pagination
	let currentPage = $state<number>(1);
	let pageSize = $state<number>(50);

	onMount(() => {
		// Read initial query params
		const qWallet = page.url.searchParams.get('walletId');
		const qCat = page.url.searchParams.get('category');
		const qType = page.url.searchParams.get('type');
		const qPreset = page.url.searchParams.get('datePreset');
		const qStart = page.url.searchParams.get('startDate');
		const qEnd = page.url.searchParams.get('endDate');

		if (qPreset && qStart && qEnd) {
			dateFilterStore.setFilter(qPreset as DatePreset, qStart, qEnd);
		}

		const qBudget = page.url.searchParams.get('budgetId');
		const qBudgetName = page.url.searchParams.get('budget');
		if (qBudget) selectedBudgetIds = [qBudget];
		if (qBudgetName) budgetFilterName = qBudgetName;
		if (qWallet) selectedWalletIds = [qWallet];
		if (qType && ['expense', 'income', 'transfer'].includes(qType)) {
			selectedType = qType as typeof selectedType;
		}
		// Ensure all transactions and categories are loaded
		reedrichStore.fetchAllTransactions().then(() => {
			if (qCat) {
				const found = reedrichStore.categories.find(
					(c) => c.categoryName.toLowerCase() === qCat.toLowerCase()
				);
				if (found) {
					selectedCategoryIds = [found.categoryId];
				}
			}
		});
	});

	// Quick search shortcut: pressing '/' focuses search input
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
			e.preventDefault();
			const el = document.getElementById('ledgerSearch');
			if (el) el.focus();
		}
	}

	const allTxs = $derived(reedrichStore.allTransactions);
	const allWallets = $derived(reedrichStore.allWallets);
	const categories = $derived(reedrichStore.categories);

	// Combobox options for Wallets
	const walletOptions = $derived<ComboboxOption[]>(
		allWallets.map((w) => ({
			value: w.walletId,
			label: w.walletName,
			group: w.institution,
			subtext: w.isLocked === 1 ? 'Locked' : 'Open'
		}))
	);

	// Combobox options for Categories
	const categoryOptions = $derived<ComboboxOption[]>(
		categories.map((c) => ({
			value: c.categoryId,
			label: c.categoryName,
			subtext: c.categoryType
		}))
	);
	const activeBudgets = $derived(reedrichStore.activeBudgets);

	// Combobox options for Budgets
	const budgetOptions = $derived<ComboboxOption[]>(
		activeBudgets.map((b) => ({
			value: b.budgetId,
			label: b.budgetName,
			group: b.categoryName,
			subtext: `${b.percentUsed}%`
		}))
	);

	// Budget lookup map for fast O(1) resolution in table rows
	const budgetMap = $derived.by(() => {
		const map = new SvelteMap<string, (typeof activeBudgets)[number]>();
		for (const b of activeBudgets) {
			map.set(b.budgetId, b);
		}
		return map;
	});

	function getBudgetName(budgetId?: string | null): string | null {
		if (!budgetId) return null;
		const b = budgetMap.get(budgetId);
		return b?.budgetName ?? null;
	}

	// Filtered transactions
	const filteredTransactions = $derived.by(() => {
		const q = searchKeyword.trim().toLowerCase();
		const start = dateFilterStore.startDate;
		const end = dateFilterStore.endDate;

		return allTxs.filter((t) => {
			// Type filter
			if (selectedType !== 'all' && t.transactionType !== selectedType) return false;

			// Status filter
			if (selectedStatus === 'realized' && t.transactionIsPlanned !== 0) return false;
			if (selectedStatus === 'planned' && t.transactionIsPlanned !== 1) return false;

			// Wallet filter (multi-selection)
			if (selectedWalletIds.length > 0) {
				const isSource = selectedWalletIds.includes(t.transactionWalletId);
				const isTarget = t.transactionTargetWalletId
					? selectedWalletIds.includes(t.transactionTargetWalletId)
					: false;
				if (!isSource && !isTarget) return false;
			}

			// Category filter (matched by categoryId)
			if (selectedCategoryIds.length > 0) {
				if (!t.transactionCategoryId || !selectedCategoryIds.includes(t.transactionCategoryId)) {
					return false;
				}
			}

			// Date range filter
			if (start && t.transactionDate.slice(0, 10) < start) return false;
			if (end && t.transactionDate.slice(0, 10) > end) return false;

			// Budget filter
			if (!matchesBudgetFilter(t, selectedBudgetIds, budgetMap, getCategoryName)) {
				return false;
			}

			// Search keyword filter
			if (q) {
				const desc = (t.transactionDescription || '').toLowerCase();
				const id = (t.transactionId || '').toLowerCase();
				if (!desc.includes(q) && !id.includes(q)) return false;
			}

			return true;
		});
	});

	// Aggregates computed from filtered transactions
	// Helper to resolve currency of any wallet
	function getWalletCurrency(id?: string | null): string {
		if (!id) return 'IDR';
		const w = allWallets.find((x) => x.walletId === id);
		return w?.currency ?? 'IDR';
	}

	// Wallet currency lookup map for fast O(1) resolution
	const walletCurrencyMap = $derived.by(() => {
		const map = new SvelteMap<string, string>();
		for (const w of allWallets) {
			map.set(w.walletId, w.currency || 'IDR');
		}
		return map;
	});

	// Aggregates computed from filtered transactions (converted to IDR)
	const aggregateStats = $derived.by(() => {
		let inSum = 0;
		let outSum = 0;
		for (const t of filteredTransactions) {
			const curr = getWalletCurrency(t.transactionWalletId);
			const amtIDR = getConvertedBalanceInIDR(t.transactionAmount, curr);
			if (t.transactionType === 'income') {
				inSum += amtIDR;
			} else if (t.transactionType === 'expense') {
				outSum += amtIDR;
			}
		}
		return {
			count: filteredTransactions.length,
			income: inSum,
			expense: outSum,
			net: inSum - outSum
		};
	});

	// Point-in-time portfolio Net Worth anchor based on T_akhir (converted to IDR)
	const currentNetWorth = $derived(reedrichStore.snapshot?.netWorth?.consolidated?.total ?? 0);
	const currentSpendable = $derived(reedrichStore.snapshot?.wallets.spendable.total);
	const currentLocked = $derived(reedrichStore.snapshot?.wallets.locked.total);
	const pointInTimeNetWorth = $derived(
		calculatePointInTimeNetWorth({
			currentNetWorth,
			allTransactions: allTxs,
			endDate: dateFilterStore.endDate,
			wallets: allWallets,
			walletCurrencyMap,
			currentSpendable,
			currentLocked
		})
	);

	// Pagination slice
	const totalPages = $derived(Math.max(1, Math.ceil(filteredTransactions.length / pageSize)));
	const pagedTransactions = $derived(
		filteredTransactions.slice((currentPage - 1) * pageSize, currentPage * pageSize)
	);

	function resetFilters() {
		dateFilterStore.reset();
		selectedWalletIds = [];
		selectedCategoryIds = [];
		selectedBudgetIds = [];
		budgetFilterName = '';
		selectedStatus = 'all';
		searchKeyword = '';
		currentPage = 1;
	}

	function getWalletName(id?: string | null): string {
		if (!id) return '—';
		const w = allWallets.find((x) => x.walletId === id);
		return w?.walletName ?? 'Akun';
	}

	function getCategoryName(catId?: string | null): string {
		if (!catId) return '—';
		const c = categories.find((x) => x.categoryId === catId);
		return c?.categoryName ?? '—';
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="space-y-4">
	<!-- Super Dynamic Filter Bar (Unified Utility Toolbar) -->
	<div class="space-y-3 rounded-lg border border-[#EAEAEA] bg-white p-3.5 shadow-2xs">
		<!-- Row 1: Search + Date Range Picker + Switcher + Actions -->
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex flex-1 flex-wrap items-center gap-2.5 min-w-[280px]">
				<!-- Instant Search with Keyboard Shortcut -->
				<div class="relative min-w-[200px] flex-1 sm:max-w-[340px]">
					<MagnifyingGlass
						class="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[#787774]"
						weight="bold"
					/>
					<input
						id="ledgerSearch"
						type="search"
						bind:value={searchKeyword}
						placeholder="Cari transaksi... (tekan '/' untuk fokus)"
						class="w-full rounded border border-[#EAEAEA] bg-[#F9F9F8] py-1.5 pr-10 pl-8 text-xs text-[#111111] placeholder:text-[#787774] focus:border-[#111111] focus:outline-hidden"
					/>
					<kbd class="absolute top-1/2 right-2 -translate-y-1/2 text-[9px]">/</kbd>
				</div>

				<!-- Custom 2-Click Date Range Picker with Presets -->
				<div class="flex items-center gap-1.5">
					<DateRangePicker
						bind:start={dateFilterStore.startDate}
						bind:end={dateFilterStore.endDate}
						bind:preset={dateFilterStore.preset}
						onchange={({ preset, start, end }) => {
							dateFilterStore.setFilter(preset as DatePreset, start, end);
							currentPage = 1;
						}}
					/>
					{#if dateFilterStore.preset !== 'this_month'}
						<button
							type="button"
							onclick={() => {
								dateFilterStore.reset();
								currentPage = 1;
							}}
							class="flex cursor-pointer items-center gap-1 rounded border border-[#EAEAEA] bg-[#F9F9F8] px-2 py-1.5 text-[11px] font-medium text-[#787774] transition-colors hover:border-[#111111] hover:text-[#111111]"
							title="Reset ke Bulan Ini"
						>
							Reset
						</button>
					{/if}
				</div>
			</div>

			<!-- Right Actions: View Mode Switcher + Actions -->
			<div class="flex items-center gap-2">
				<ViewModeSwitcher />

				<button
					type="button"
					onclick={() => transactionFormStore.openCreate()}
					class="flex cursor-pointer items-center gap-1.5 rounded bg-[#111111] px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#333333] active:scale-98"
				>
					<Plus class="size-3.5" weight="bold" />
					<span>Catat Transaksi</span>
				</button>

				<button
					type="button"
					onclick={resetFilters}
					class="cursor-pointer rounded border border-[#EAEAEA] bg-white px-2.5 py-1.5 text-xs text-[#787774] transition-colors hover:bg-[#F9F9F8] hover:text-[#111111]"
				>
					Reset Filter
				</button>
			</div>
		</div>

		<!-- Row 2: Multi-select Comboboxes + Type & Status Buttons -->
		<div class="flex flex-wrap items-center gap-2.5 border-t border-[#EAEAEA] pt-2 text-xs">
			<!-- Searchable Multi-Select Wallet Combobox -->
			<ComboboxMultiSelect
				options={walletOptions}
				bind:selected={selectedWalletIds}
				placeholder="Semua Dompet"
				searchPlaceholder="Ketik nama akun/bank..."
				onchange={() => (currentPage = 1)}
			/>

			<!-- Searchable Multi-Select Category Combobox -->
			<ComboboxMultiSelect
				options={categoryOptions}
				bind:selected={selectedCategoryIds}
				placeholder="Semua Kategori"
				searchPlaceholder="Ketik nama kategori..."
				onchange={() => (currentPage = 1)}
			/>

			<!-- Searchable Multi-Select Budget Combobox -->
			<ComboboxMultiSelect
				options={budgetOptions}
				bind:selected={selectedBudgetIds}
				placeholder="Semua Anggaran"
				searchPlaceholder="Ketik nama anggaran..."
				onchange={() => (currentPage = 1)}
			/>

			<!-- Type Buttons -->
			<div class="flex items-center rounded border border-[#EAEAEA] bg-[#F9F9F8] p-0.5">
				<button
					type="button"
					onclick={() => {
						selectedType = 'all';
						currentPage = 1;
					}}
					class="cursor-pointer rounded px-2 py-0.5 text-[11px] font-medium transition-colors {selectedType ===
					'all'
						? 'bg-white text-[#111111] shadow-2xs'
						: 'text-[#787774]'}"
				>
					Semua Tipe
				</button>
				<button
					type="button"
					onclick={() => {
						selectedType = 'expense';
						currentPage = 1;
					}}
					class="cursor-pointer rounded px-2 py-0.5 text-[11px] font-medium transition-colors {selectedType ===
					'expense'
						? 'bg-white text-[#111111] shadow-2xs'
						: 'text-[#787774]'}"
				>
					Pengeluaran
				</button>
				<button
					type="button"
					onclick={() => {
						selectedType = 'income';
						currentPage = 1;
					}}
					class="cursor-pointer rounded px-2 py-0.5 text-[11px] font-medium transition-colors {selectedType ===
					'income'
						? 'bg-white text-[#111111] shadow-2xs'
						: 'text-[#787774]'}"
				>
					Pemasukan
				</button>
				<button
					type="button"
					onclick={() => {
						selectedType = 'transfer';
						currentPage = 1;
					}}
					class="cursor-pointer rounded px-2 py-0.5 text-[11px] font-medium transition-colors {selectedType ===
					'transfer'
						? 'bg-white text-[#111111] shadow-2xs'
						: 'text-[#787774]'}"
				>
					Transfer
				</button>
			</div>

			<!-- Status Buttons -->
			<div class="flex items-center rounded border border-[#EAEAEA] bg-[#F9F9F8] p-0.5">
				<button
					type="button"
					onclick={() => {
						selectedStatus = 'all';
						currentPage = 1;
					}}
					class="cursor-pointer rounded px-2 py-0.5 text-[11px] font-medium transition-colors {selectedStatus ===
					'all'
						? 'bg-white text-[#111111] shadow-2xs'
						: 'text-[#787774]'}"
				>
					Semua Status
				</button>
				<button
					type="button"
					onclick={() => {
						selectedStatus = 'realized';
						currentPage = 1;
					}}
					class="cursor-pointer rounded px-2 py-0.5 text-[11px] font-medium transition-colors {selectedStatus ===
					'realized'
						? 'bg-white text-[#111111] shadow-2xs'
						: 'text-[#787774]'}"
				>
					Realized
				</button>
				<button
					type="button"
					onclick={() => {
						selectedStatus = 'planned';
						currentPage = 1;
					}}
					class="cursor-pointer rounded px-2 py-0.5 text-[11px] font-medium transition-colors {selectedStatus ===
					'planned'
						? 'bg-white text-[#111111] shadow-2xs'
						: 'text-[#787774]'}"
				>
					Planned
				</button>
			</div>

			<!-- Page Size Selector -->
			<div class="ml-auto flex items-center gap-1.5 text-xs text-[#787774]">
				<span>Baris:</span>
				<select
					bind:value={pageSize}
					onchange={() => (currentPage = 1)}
					class="cursor-pointer rounded border border-[#EAEAEA] bg-[#F9F9F8] px-2 py-0.5 text-xs text-[#111111]"
				>
					<option value={25}>25</option>
					<option value={50}>50</option>
					<option value={100}>100</option>
				</select>
			</div>
		</div>

		<!-- Active Budget Filter Chip -->
		{#if selectedBudgetIds.length > 0}
			<div class="flex flex-wrap items-center gap-2 border-t border-[#EAEAEA] pt-2 text-xs">
				<span class="text-[11px] text-[#787774]">Pagu Anggaran Aktif:</span>
				{#each selectedBudgetIds as bId (bId)}
					{@const bName = getBudgetName(bId) || budgetFilterName || 'Anggaran'}
					<span
						class="inline-flex items-center gap-1.5 rounded-full border border-[#956400]/20 bg-[#FBF3DB] px-2.5 py-0.5 text-[11px] font-medium text-[#956400]"
					>
						<span>{bName}</span>
						<button
							type="button"
							onclick={() => {
								selectedBudgetIds = selectedBudgetIds.filter((id) => id !== bId);
								budgetFilterName = '';
								currentPage = 1;
							}}
							class="cursor-pointer transition-opacity hover:opacity-75"
							title="Hapus filter anggaran"
							aria-label="Hapus filter anggaran"
						>
							<X class="size-3" weight="bold" />
						</button>
					</span>
				{/each}
				<button
					type="button"
					onclick={() => {
						selectedBudgetIds = [];
						budgetFilterName = '';
						currentPage = 1;
					}}
					class="cursor-pointer text-[10px] text-[#787774] underline hover:text-[#111111]"
				>
					Hapus Filter Anggaran
				</button>
			</div>
		{/if}
	</div>

	{#if settingsStore.settings.ledgerViewMode === 'calendar_board'}
		<HorizonBoard {globalFilters} />
	{:else}
		<!-- Dual-Layer Live Summary Strip -->
	<div
		class="flex flex-col gap-3 rounded-lg border border-[#EAEAEA] bg-white p-3.5 shadow-2xs lg:flex-row lg:items-center lg:justify-between lg:gap-6"
	>
		<!-- Layer 1: Local Filter Scope (Left Zone) -->
		<div class="flex flex-wrap items-center gap-3 text-xs sm:gap-4">
			<div
				class="flex items-center gap-1.5 rounded border border-[#EAEAEA] bg-[#F9F9F8] px-2.5 py-1"
			>
				<span class="font-mono text-xs font-semibold text-[#111111]">
					{aggregateStats.count} transaksi
				</span>
				<span class="text-[11px] text-[#787774]">dalam filter aktif</span>
			</div>

			<div class="flex flex-wrap items-center gap-3 font-mono text-xs tabular-nums sm:gap-4">
				<div>
					<span class="text-[10px] text-[#787774] uppercase">Masuk:</span>
					<span class="ml-1 font-semibold text-[#346538]">+{fmtIDR(aggregateStats.income)}</span>
				</div>
				<div>
					<span class="text-[10px] text-[#787774] uppercase">Keluar:</span>
					<span class="ml-1 font-semibold text-[#111111]">−{fmtIDR(aggregateStats.expense)}</span>
				</div>
				<div class="border-l border-[#EAEAEA] pl-3">
					<span class="text-[10px] text-[#787774] uppercase">Net Terfilter:</span>
					<span
						class="ml-1 font-semibold {aggregateStats.net >= 0
							? 'text-[#346538]'
							: 'text-[#9F2F2D]'}"
					>
						{aggregateStats.net >= 0 ? '+' : '−'}{fmtIDR(Math.abs(aggregateStats.net))}
					</span>
				</div>
			</div>
		</div>

		<!-- Layer 2: Global Balance Sheet Anchor (Right Zone) -->
		<div
			class="flex shrink-0 flex-col gap-1 border-t border-[#EAEAEA] pt-2.5 text-left lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5 lg:text-right"
		>
			<span class="text-[10px] font-semibold tracking-wider text-[#787774] uppercase">
				{pointInTimeNetWorth.label}
			</span>
			<span class="font-mono text-base font-bold text-[#111111] tabular-nums">
				{fmtIDR(pointInTimeNetWorth.amount)}
			</span>

			<!-- Spendable vs Locked Breakdown -->
			<div
				class="flex flex-wrap items-center gap-1.5 font-mono text-[10px] sm:text-[11px] lg:justify-end"
			>
				<span class="flex items-center gap-1 text-[#346538]">
					<span class="size-1.5 rounded-full bg-[#346538]"></span>
					<span>Bebas: {fmtIDR(pointInTimeNetWorth.spendableAmount)}</span>
				</span>
				<span class="text-[#C9C4B8]">·</span>
				<span class="flex items-center gap-1 text-[#956400]">
					<span class="size-1.5 rounded-full bg-[#956400]"></span>
					<span>Cadangan: {fmtIDR(pointInTimeNetWorth.lockedAmount)}</span>
				</span>
			</div>

			<!-- Subtext and Link to Accounts Timeline -->
			<div class="flex items-center gap-1 text-[10px] text-[#787774] lg:justify-end">
				<span>{pointInTimeNetWorth.subtext}</span>
				<span>·</span>
				<a
					href="/accounts?datePreset={encodeURIComponent(
						dateFilterStore.preset
					)}&startDate={encodeURIComponent(dateFilterStore.startDate)}&endDate={encodeURIComponent(
						dateFilterStore.endDate
					)}"
					class="font-medium text-[#111111] underline transition-colors hover:text-[#787774]"
				>
					Rincian Akun →
				</a>
			</div>
		</div>
	</div>

	<!-- Full-Width Tabular Transaction Grid -->
	<div class="overflow-hidden rounded-lg border border-[#EAEAEA] bg-white shadow-2xs">
		{#if reedrichStore.isLedgerLoading}
			<div class="divide-y divide-[#EAEAEA] p-4">
				{#each [0, 1, 2, 3, 4, 5, 6, 7] as i (i)}
					<div class="flex items-center justify-between gap-4 py-2.5">
						<Skeleton class="h-3.5 w-20 shrink-0" />
						<Skeleton class="h-3.5 w-48 flex-1" />
						<Skeleton class="hidden h-3.5 w-24 sm:block" />
						<Skeleton class="hidden h-3.5 w-16 md:block" />
						<Skeleton class="h-3.5 w-24 shrink-0 text-right" />
					</div>
				{/each}
			</div>
		{:else if pagedTransactions.length === 0}
			<div class="py-16 text-center font-mono text-xs text-[#787774]">
				Tidak ada transaksi yang cocok dengan kriteria filter Anda.
			</div>
		{:else}
			<!-- Desktop: Full Tabular Grid (>= 768px) -->
			<div class="hidden overflow-x-auto md:block">
				<table class="w-full border-collapse text-left text-xs">
					<thead
						class="border-b border-[#EAEAEA] bg-[#F9F9F8] text-[10px] font-medium tracking-wider text-[#787774] uppercase"
					>
						<tr>
							<th class="px-4 py-2.5 font-medium">Tanggal</th>
							<th class="px-4 py-2.5 font-medium">Deskripsi</th>
							<th class="px-4 py-2.5 font-medium">Kategori</th>
							<th class="px-4 py-2.5 font-medium">Tipe</th>
							<th class="px-4 py-2.5 font-medium">Dari Akun</th>
							<th class="px-4 py-2.5 font-medium">Ke Akun</th>
							<th class="px-4 py-2.5 font-medium">Status</th>
							<th class="px-4 py-2.5 text-right font-medium">Nominal</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-[#EAEAEA]">
						{#each pagedTransactions as t (t.transactionId)}
							{@const isInc = t.transactionType === 'income'}
							{@const isPlan = t.transactionIsPlanned === 1}
							{@const curr = getWalletCurrency(t.transactionWalletId)}
							{@const amtIDR = getConvertedBalanceInIDR(t.transactionAmount, curr)}
							<tr
								class="cursor-pointer transition-colors hover:bg-[#F0EFEC]/60"
								onclick={() => transactionFormStore.openView(t)}
							>
								<td class="px-4 py-2.5 font-mono text-[11px] whitespace-nowrap text-[#787774]">
									{dFmt(t.transactionDate)}
								</td>
								<td class="max-w-[260px] px-4 py-2.5">
									<div
										class="truncate font-medium text-[#111111]"
										title={t.transactionDescription || ''}
									>
										{t.transactionDescription || '(tanpa deskripsi)'}
									</div>
								</td>
								<td class="max-w-[140px] px-4 py-2.5 font-medium text-[#111111]">
									<div class="truncate">
										{getCategoryName(t.transactionCategoryId)}
									</div>
									{#if getBudgetName(t.transactionBudgetId)}
										<div class="mt-0.5">
											<span
												class="py-0.2 rounded bg-[#FBF3DB] px-1.5 font-mono text-[9px] font-medium text-[#956400]"
											>
												{getBudgetName(t.transactionBudgetId)}
											</span>
										</div>
									{/if}
								</td>
								<td class="px-4 py-2.5 whitespace-nowrap">
									<span
										class="rounded px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase {t.transactionType ===
										'income'
											? 'bg-[#EDF3EC] text-[#346538]'
											: t.transactionType === 'expense'
												? 'bg-[#FDEBEC] text-[#9F2F2D]'
												: 'bg-[#E1F3FE] text-[#1F6C9F]'}"
									>
										{t.transactionType}
									</span>
								</td>
								<td class="max-w-[120px] truncate px-4 py-2.5 text-[#787774]">
									{getWalletName(t.transactionWalletId)}
								</td>
								<td class="max-w-[120px] truncate px-4 py-2.5 text-[#787774]">
									{getWalletName(t.transactionTargetWalletId)}
								</td>
								<td class="px-4 py-2.5 whitespace-nowrap">
									<span
										class="font-mono text-[10px] font-medium uppercase {isPlan
											? 'text-[#956400]'
											: 'text-[#787774]'}"
									>
										{isPlan ? 'Planned' : 'Realized'}
									</span>
								</td>
								<td
									class="px-4 py-2.5 text-right font-mono font-semibold whitespace-nowrap tabular-nums {isInc
										? 'text-[#346538]'
										: 'text-[#111111]'}"
								>
									<div>{isInc ? '+' : '−'}{fmtIDR(amtIDR)}</div>
									{#if curr !== 'IDR'}
										<div class="font-mono text-[9px] font-normal text-[#787774]">
											({fmtCurrency(t.transactionAmount, curr)})
										</div>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Mobile: Dense Document Feed (< 768px, Zero Horizontal Scroll) -->
			<div class="divide-y divide-[#EAEAEA] md:hidden">
				{#each pagedTransactions as t (t.transactionId)}
					{@const isInc = t.transactionType === 'income'}
					{@const isPlan = t.transactionIsPlanned === 1}
					{@const curr = getWalletCurrency(t.transactionWalletId)}
					{@const amtIDR = getConvertedBalanceInIDR(t.transactionAmount, curr)}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="cursor-pointer p-3.5 transition-colors hover:bg-[#F9F9F8] active:bg-[#F0EFEC]"
						onclick={() => transactionFormStore.openView(t)}
					>
						<!-- Line 1: Description + Amount -->
						<div class="flex items-start justify-between gap-2.5">
							<div
								class="line-clamp-1 text-xs font-medium text-[#111111]"
								title={t.transactionDescription || ''}
							>
								{t.transactionDescription || '(tanpa deskripsi)'}
							</div>
							<div
								class="text-right font-mono text-xs font-bold whitespace-nowrap tabular-nums {isInc
									? 'text-[#346538]'
									: 'text-[#111111]'}"
							>
								<div>{isInc ? '+' : '−'}{fmtIDR(amtIDR)}</div>
								{#if curr !== 'IDR'}
									<div class="font-mono text-[9px] font-normal text-[#787774]">
										({fmtCurrency(t.transactionAmount, curr)})
									</div>
								{/if}
							</div>
						</div>

						<!-- Line 2: Date · Category · Routing · Status -->
						<div
							class="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[11px] text-[#787774]"
						>
							<div class="flex items-center gap-1.5 truncate">
								<span class="font-mono text-[10px]">{dFmt(t.transactionDate)}</span>
								<span>·</span>
								<span
									class="py-0.2 rounded bg-[#F0EFEC] px-1.5 text-[10px] font-medium text-[#111111]"
								>
									{getCategoryName(t.transactionCategoryId)}
								</span>
								{#if getBudgetName(t.transactionBudgetId)}
									<span
										class="py-0.2 rounded bg-[#FBF3DB] px-1.5 font-mono text-[9px] font-medium text-[#956400]"
									>
										{getBudgetName(t.transactionBudgetId)}
									</span>
								{/if}
								<span class="truncate">
									{getWalletName(t.transactionWalletId)}{t.transactionTargetWalletId
										? ` → ${getWalletName(t.transactionTargetWalletId)}`
										: ''}
								</span>
							</div>
							{#if isPlan}
								<span class="font-mono text-[9px] font-semibold text-[#956400] uppercase">
									Planned
								</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>

			<!-- Pagination Footer with Page Size & Stepper -->
			<div
				class="flex items-center justify-between border-t border-[#EAEAEA] bg-[#F9F9F8] px-4 py-2.5 text-xs text-[#787774]"
			>
				<div>
					Halaman <strong class="font-mono text-[#111111]">{currentPage}</strong> dari
					<span class="font-mono">{totalPages}</span> ({filteredTransactions.length} total baris)
				</div>

				<div class="flex items-center gap-1.5">
					<button
						type="button"
						disabled={currentPage <= 1}
						onclick={() => (currentPage = Math.max(1, currentPage - 1))}
						class="flex cursor-pointer items-center gap-1 rounded border border-[#EAEAEA] bg-white px-2 py-1 text-xs text-[#111111] hover:bg-[#F9F9F8] disabled:cursor-not-allowed disabled:opacity-40"
					>
						<ArrowLeft class="size-3" weight="bold" />
						<span>Sebelumnya</span>
					</button>
					<button
						type="button"
						disabled={currentPage >= totalPages}
						onclick={() => (currentPage = Math.min(totalPages, currentPage + 1))}
						class="flex cursor-pointer items-center gap-1 rounded border border-[#EAEAEA] bg-white px-2 py-1 text-xs text-[#111111] hover:bg-[#F9F9F8] disabled:cursor-not-allowed disabled:opacity-40"
					>
						<span>Berikutnya</span>
						<ArrowRight class="size-3" weight="bold" />
					</button>
				</div>
			</div>
		{/if}
	</div>
	{/if}
</div>
