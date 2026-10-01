<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { dateFilterStore } from '$lib/stores/date-filter.svelte';
	import type { TransactionRecord } from '$lib/types/account-detail';
	import {
		calculateCategoryMetrics,
		sortCategoryMetrics,
		type CategorySortOption,
		type CategoryMetricItem
	} from '$lib/utils/category-metrics';
	import { fmtIDR } from '$lib/utils/currency';
	import { t } from '$lib/i18n/index.svelte';
	import CategoryKpiStrip from './CategoryKpiStrip.svelte';
	import CategoryControlsBar from './CategoryControlsBar.svelte';
	import CategoryRowItem from './CategoryRowItem.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import ArrowDown from 'phosphor-svelte/lib/ArrowDown';
	import ArrowUp from 'phosphor-svelte/lib/ArrowUp';

	// Filters & Sorting state
	let searchQuery = $state('');
	let typeFilter = $state<'all' | 'expense' | 'income'>('all');
	let sortBy = $state<CategorySortOption>('balance_desc');
	let viewMode = $state<'grouped' | 'flat'>('grouped');
	let onlyActive = $state(false);

	let categoryTransactions = $state<TransactionRecord[]>([]);
	let isQueryLoading = $state(false);

	$effect(() => {
		const start = dateFilterStore.startDate;
		const end = dateFilterStore.endDate;
		const controller = new AbortController();
		isQueryLoading = true;

		reedrichStore
			.fetchTransactions(
				{
					startDate: start || undefined,
					endDate: end || undefined,
					limit: 200,
					envelope: true
				},
				controller.signal
			)
			.then((env) => {
				if (controller.signal.aborted) return;
				categoryTransactions = env.items;
			})
			.catch((err) => {
				if (controller.signal.aborted) return;
				console.warn('CategoryStudio transactions query error:', err);
			})
			.finally(() => {
				if (!controller.signal.aborted) {
					isQueryLoading = false;
				}
			});

		return () => controller.abort();
	});

	const allWallets = $derived(reedrichStore.allWallets);
	const categories = $derived(reedrichStore.categories);
	const activeBudgets = $derived(reedrichStore.activeBudgets);

	// Wallet currency lookup map for fast conversion
	const walletCurrencyMap = $derived.by(() => {
		const map = new SvelteMap<string, string>();
		for (const w of allWallets) {
			map.set(w.walletId, w.currency || 'IDR');
		}
		return map;
	});

	// Dynamic point-in-time category metrics
	const stats = $derived.by(() => {
		return calculateCategoryMetrics({
			categories,
			transactions: categoryTransactions,
			budgets: activeBudgets,
			walletCurrencyMap,
			startDate: dateFilterStore.startDate,
			endDate: dateFilterStore.endDate
		});
	});

	// Filter items based on search query and type filter
	const filteredItems = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		return stats.items.filter((item) => {
			if (onlyActive && item.transactionCount === 0 && item.totalAmountIDR === 0) {
				return false;
			}
			if (typeFilter !== 'all' && item.category.categoryType !== typeFilter) {
				return false;
			}
			if (q && !item.category.categoryName.toLowerCase().includes(q)) {
				return false;
			}
			return true;
		});
	});

	// Sorted items for Flat view
	const sortedFlatItems = $derived.by(() => {
		return sortCategoryMetrics(filteredItems, sortBy);
	});

	// Grouped items
	const groupedExpenseItems = $derived.by(() => {
		const list = filteredItems.filter((i) => i.category.categoryType === 'expense');
		return sortCategoryMetrics(list, sortBy);
	});

	const groupedIncomeItems = $derived.by(() => {
		const list = filteredItems.filter((i) => i.category.categoryType === 'income');
		return sortCategoryMetrics(list, sortBy);
	});

	// Subtotals for grouped sections
	const expenseSubtotal = $derived.by(() => {
		return groupedExpenseItems.reduce((acc, i) => acc + i.totalAmountIDR, 0);
	});

	const incomeSubtotal = $derived.by(() => {
		return groupedIncomeItems.reduce((acc, i) => acc + i.totalAmountIDR, 0);
	});
</script>

<div class="space-y-4">
	<!-- Macro Summary Tiles (KPI Strip) -->
	<CategoryKpiStrip
		totalExpenseIDR={stats.totalExpenseIDR}
		totalIncomeIDR={stats.totalIncomeIDR}
		dominantExpenseCategory={stats.dominantExpenseCategory}
		expenseCount={stats.expenseItems.length}
		incomeCount={stats.incomeItems.length}
		periodLabel={dateFilterStore.preset === 'this_month' ? 'Bulan Ini' : 'Periode Kustom'}
	/>

	<!-- Controls Bar -->
	<CategoryControlsBar bind:searchQuery bind:typeFilter bind:sortBy bind:viewMode bind:onlyActive />

	<!-- Content: Skeleton vs List -->
	{#if (reedrichStore.isLoading || isQueryLoading) && categories.length === 0}
		<!-- Skeleton Loading State -->
		<div class="space-y-4">
			{#each [0, 1] as group (group)}
				<div class="overflow-hidden rounded-lg border border-[#EAEAEA] bg-white p-4 shadow-2xs">
					<div class="flex items-center justify-between pb-3">
						<Skeleton class="h-4 w-36" />
						<Skeleton class="h-4 w-28" />
					</div>
					<div class="space-y-3 border-t border-[#EAEAEA] pt-3">
						{#each [0, 1, 2] as row (row)}
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2.5">
									<Skeleton class="size-8 rounded-md" />
									<div class="space-y-1">
										<Skeleton class="h-3.5 w-24" />
										<Skeleton class="h-2.5 w-16" />
									</div>
								</div>
								<Skeleton class="h-3.5 w-20" />
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{:else if filteredItems.length === 0}
		<!-- Empty Filter State -->
		<div
			class="flex flex-col items-center justify-center rounded-lg border border-[#EAEAEA] bg-white p-8 text-center shadow-2xs"
		>
			<p class="text-xs font-medium text-[#787774]">
				Tidak ada kategori yang sesuai dengan filter atau pencarian Anda.
			</p>
			{#if searchQuery}
				<button
					type="button"
					onclick={() => (searchQuery = '')}
					class="mt-2 text-xs font-semibold text-[#111111] underline hover:text-[#787774]"
				>
					Hapus kata kunci pencarian
				</button>
			{/if}
		</div>
	{:else if viewMode === 'flat'}
		<!-- Flat View: Single Unified Ranked Table -->
		<div class="overflow-hidden rounded-lg border border-[#EAEAEA] bg-white shadow-2xs">
			<div
				class="flex items-center justify-between border-b border-[#EAEAEA] bg-[#F9F9F8] px-4 py-2.5"
			>
				<span class="text-xs font-semibold text-[#111111]">
					Daftar Seluruh Kategori ({sortedFlatItems.length})
				</span>
				<span class="font-mono text-[11px] text-[#787774]">
					Urut: {sortBy === 'balance_desc'
						? 'Nominal Terbesar'
						: sortBy === 'count_desc'
							? 'Frekuensi'
							: 'Nama'}
				</span>
			</div>
			<div class="divide-y divide-[#EAEAEA]">
				{#each sortedFlatItems as item (item.category.categoryId)}
					<CategoryRowItem {item} />
				{/each}
			</div>
		</div>
	{:else}
		<!-- Grouped View: Expense & Income Sections -->
		<div class="space-y-4">
			<!-- Section 1: Pengeluaran (Expense) -->
			{#if typeFilter === 'all' || typeFilter === 'expense'}
				<div class="overflow-hidden rounded-lg border border-[#EAEAEA] bg-white shadow-2xs">
					<!-- Header with Subtotal -->
					<div
						class="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAEAEA] bg-[#F9F9F8] px-4 py-3"
					>
						<div class="flex items-center gap-2">
							<div
								class="flex size-5 items-center justify-center rounded bg-[#FDEBEC] text-[#9F2F2D]"
							>
								<ArrowDown class="size-3" weight="bold" />
							</div>
							<h3 class="text-sm font-semibold text-[#111111]">
								{t('planning.categories.expenseTitle')}
							</h3>
							<span class="rounded bg-[#EFEFED] px-2 py-0.5 font-mono text-[10px] text-[#787774]">
								{t('planning.categories.countLabel', { count: groupedExpenseItems.length })}
							</span>
						</div>

						<div class="font-mono text-xs font-semibold text-[#111111] tabular-nums">
							Subtotal: {fmtIDR(expenseSubtotal)}
						</div>
					</div>

					<!-- List -->
					{#if groupedExpenseItems.length === 0}
						<div class="p-4 text-center text-xs text-[#787774]">
							{t('common.empty')}
						</div>
					{:else}
						<div class="divide-y divide-[#EAEAEA]">
							{#each groupedExpenseItems as item (item.category.categoryId)}
								<CategoryRowItem {item} />
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			<!-- Section 2: Pemasukan (Income) -->
			{#if typeFilter === 'all' || typeFilter === 'income'}
				<div class="overflow-hidden rounded-lg border border-[#EAEAEA] bg-white shadow-2xs">
					<!-- Header with Subtotal -->
					<div
						class="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAEAEA] bg-[#F9F9F8] px-4 py-3"
					>
						<div class="flex items-center gap-2">
							<div
								class="flex size-5 items-center justify-center rounded bg-[#EDF3EC] text-[#346538]"
							>
								<ArrowUp class="size-3" weight="bold" />
							</div>
							<h3 class="text-sm font-semibold text-[#111111]">
								{t('planning.categories.incomeTitle')}
							</h3>
							<span class="rounded bg-[#EFEFED] px-2 py-0.5 font-mono text-[10px] text-[#787774]">
								{t('planning.categories.countLabel', { count: groupedIncomeItems.length })}
							</span>
						</div>

						<div class="font-mono text-xs font-semibold text-[#346538] tabular-nums">
							Subtotal: +{fmtIDR(incomeSubtotal)}
						</div>
					</div>

					<!-- List -->
					{#if groupedIncomeItems.length === 0}
						<div class="p-4 text-center text-xs text-[#787774]">
							{t('common.empty')}
						</div>
					{:else}
						<div class="divide-y divide-[#EAEAEA]">
							{#each groupedIncomeItems as item (item.category.categoryId)}
								<CategoryRowItem {item} />
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>
