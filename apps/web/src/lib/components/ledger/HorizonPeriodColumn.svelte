<script lang="ts">
	import { reedrichStore } from '$lib/stores/reedrich.svelte.js';
	import { transactionFormStore } from '$lib/stores/transaction-form.svelte.js';
	import { settingsStore } from '$lib/stores/settings.svelte.js';
	import { dateFilterStore } from '$lib/stores/date-filter.svelte';
	import { fmtIDR, getConvertedBalanceInIDR } from '$lib/utils/currency';
	import { dFmt, mLabel } from '$lib/utils/dates';
	import { t, i18nStore } from '$lib/i18n/index.svelte';
	import Plus from 'phosphor-svelte/lib/Plus';
	import CornersOut from 'phosphor-svelte/lib/CornersOut';
	import Trash from 'phosphor-svelte/lib/Trash';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import PeriodSummaryCard, { type PeriodSummary } from './PeriodSummaryCard.svelte';
	import type { TransactionRecord } from '$lib/types/account-detail';

	export interface GlobalFilters {
		walletIds: string[];
		categoryIds: string[];
		budgetIds: string[];
		type: 'all' | 'expense' | 'income' | 'transfer';
		status: 'all' | 'realized' | 'planned';
		searchKeyword: string;
	}

	let {
		periodKey,
		startDate,
		endDate,
		periodSummary,
		globalFilters,
		canRemove = true
	}: {
		periodKey: string;
		startDate: string;
		endDate: string;
		periodSummary: PeriodSummary;
		globalFilters: GlobalFilters;
		canRemove?: boolean;
	} = $props();

	// Format title: "YYYY-MM" -> "Oktober 2026"
	// Format title: "YYYY-MM" -> "October 2026" / "Oktober 2026"
	const periodTitle = $derived.by(() => {
		return mLabel(periodKey, i18nStore.locale);
	});

	const allWallets = $derived(reedrichStore.allWallets);
	const categories = $derived(reedrichStore.categories);

	function getWalletCurrency(id?: string | null): string {
		if (!id) return 'IDR';
		const w = allWallets.find((x) => x.walletId === id);
		return w?.currency ?? 'IDR';
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

	// Card-Level Localized Query State (Reedrich v1.13.0)
	let isColumnLoading = $state<boolean>(true);
	let isLoadingMore = $state<boolean>(false);
	let columnError = $state<string | null>(null);
	let periodTransactions = $state<TransactionRecord[]>([]);
	let hasNext = $state<boolean>(false);
	let totalCount = $state<number>(0);
	$effect(() => {
		const start = startDate;
		const end = endDate;
		const wIds = globalFilters.walletIds;
		const cIds = globalFilters.categoryIds;
		const bIds = globalFilters.budgetIds;
		const fType = globalFilters.type;
		const fStatus = globalFilters.status;
		const kw = globalFilters.searchKeyword.trim();

		const controller = new AbortController();
		isColumnLoading = true;
		columnError = null;

		reedrichStore
			.fetchTransactions(
				{
					startDate: start,
					endDate: end,
					walletId: wIds.length > 0 ? wIds : undefined,
					categoryId: cIds.length > 0 ? cIds : undefined,
					budgetId: bIds.length > 0 ? bIds : undefined,
					type: fType,
					status: fStatus,
					q: kw || undefined,
					envelope: true,
					limit: 50
				},
				controller.signal
			)
			.then((envelope) => {
				if (controller.signal.aborted) return;
				periodTransactions = envelope.items;
				hasNext = envelope.pagination?.hasNext ?? false;
				totalCount = envelope.pagination?.total ?? envelope.items.length;
			})
			.catch((err) => {
				if (controller.signal.aborted) return;
				console.warn('Period column fetch error:', err);
				columnError = err instanceof Error ? err.message : String(err);
			})
			.finally(() => {
				if (!controller.signal.aborted) {
					isColumnLoading = false;
				}
			});

		return () => {
			controller.abort();
		};
	});

	async function loadMore() {
		if (isLoadingMore || !hasNext) return;
		isLoadingMore = true;
		try {
			const envelope = await reedrichStore.fetchTransactions({
				startDate,
				endDate,
				walletId: globalFilters.walletIds.length > 0 ? globalFilters.walletIds : undefined,
				categoryId: globalFilters.categoryIds.length > 0 ? globalFilters.categoryIds : undefined,
				budgetId: globalFilters.budgetIds.length > 0 ? globalFilters.budgetIds : undefined,
				type: globalFilters.type,
				status: globalFilters.status,
				q: globalFilters.searchKeyword.trim() || undefined,
				envelope: true,
				limit: 50,
				offset: periodTransactions.length
			});
			periodTransactions = [...periodTransactions, ...envelope.items];
			hasNext = envelope.pagination?.hasNext ?? false;
			totalCount = envelope.pagination?.total ?? periodTransactions.length;
		} catch (err) {
			console.warn('Gagal memuat transaksi berikutnya:', err);
		} finally {
			isLoadingMore = false;
		}
	}

	// Local cashflow calculation from card's own data
	const localCashflow = $derived.by(() => {
		let inSum = 0;
		let outSum = 0;
		for (const t of periodTransactions) {
			const curr = getWalletCurrency(t.transactionWalletId);
			const amtIDR = getConvertedBalanceInIDR(t.transactionAmount, curr);
			if (t.transactionType === 'income') {
				inSum += amtIDR;
			} else if (t.transactionType === 'expense') {
				outSum += amtIDR;
			}
		}
		return {
			income: inSum,
			expense: outSum,
			net: inSum - outSum
		};
	});

	function handleQuickAdd() {
		// Use today if inside this period, else 1st day of period
		const todayIso = new Date().toISOString().slice(0, 10);
		const initialDate = todayIso >= startDate && todayIso <= endDate ? todayIso : startDate;
		transactionFormStore.openCreate();
		transactionFormStore.date = initialDate;
	}
	function handleMaximize() {
		dateFilterStore.setFilter('custom', startDate, endDate);
		settingsStore.setViewMode('single');
	}

	function handleRowClick(t: TransactionRecord) {
		transactionFormStore.openView(t);
	}
</script>

<div class="flex flex-col rounded-lg border border-[#EAEAEA] bg-white shadow-2xs">
	<!-- Period Header -->
	<div
		class="flex items-center justify-between border-b border-[#EAEAEA] bg-[#FDFCFB] px-3.5 py-2.5"
	>
		<div>
			<h2 class="text-xs font-semibold text-[#111111]">{periodTitle}</h2>
			<span class="font-mono text-[10px] text-[#787774]">
				{periodTransactions.length}
				{i18nStore.locale === 'id' ? 'transaksi' : 'transactions'}
			</span>
		</div>

		<div class="flex items-center gap-1">
			<button
				type="button"
				onclick={handleMaximize}
				class="flex size-6 cursor-pointer items-center justify-center rounded text-[#787774] transition-colors hover:bg-[#F0EFEC] hover:text-[#111111] active:scale-95"
				title={i18nStore.locale === 'id'
					? 'Maksimalkan periode ke tampilan List'
					: 'Maximize period to List view'}
				aria-label={i18nStore.locale === 'id'
					? 'Maksimalkan periode ke tampilan List'
					: 'Maximize period to List view'}
			>
				<CornersOut class="size-3.5" weight="bold" />
			</button>

			<button
				type="button"
				onclick={handleQuickAdd}
				class="flex size-6 cursor-pointer items-center justify-center rounded bg-[#111111] text-white transition-colors hover:bg-[#333333] active:scale-95"
				title={t('ledger.planTransaction')}
				aria-label={t('ledger.planTransaction')}
			>
				<Plus class="size-3.5" weight="bold" />
			</button>

			{#if canRemove}
				<button
					type="button"
					onclick={() => settingsStore.removePeriod(periodKey)}
					class="flex size-6 cursor-pointer items-center justify-center rounded text-[#787774] transition-colors hover:bg-[#F0EFEC] hover:text-[#9F2F2D] active:scale-95"
					title={i18nStore.locale === 'id'
						? 'Hapus periode dari board'
						: 'Remove period from board'}
					aria-label={i18nStore.locale === 'id'
						? 'Hapus periode dari board'
						: 'Remove period from board'}
				>
					<Trash class="size-3.5" weight="bold" />
				</button>
			{/if}
		</div>
	</div>

	<!-- Dense Ledger Table -->
	<div class="h-[320px] divide-y divide-[#EAEAEA] overflow-y-auto text-xs">
		{#if isColumnLoading && periodTransactions.length === 0}
			<div class="space-y-3 p-3.5">
				{#each [0, 1, 2, 3, 4] as i (i)}
					<div class="space-y-1.5 py-1">
						<div class="flex items-center justify-between gap-2">
							<Skeleton class="h-3 w-14 shrink-0" />
							<Skeleton class="h-3 max-w-[140px] flex-1" />
							<Skeleton class="h-3 w-20 shrink-0 text-right" />
						</div>
						<div class="flex items-center justify-between">
							<Skeleton class="h-2.5 w-16" />
							<Skeleton class="h-2.5 w-12" />
						</div>
					</div>
				{/each}
			</div>
		{:else if columnError}
			<div class="flex h-full flex-col items-center justify-center p-4 text-center">
				<p class="text-[11px] text-[#9F2F2D]">{columnError}</p>
			</div>
		{:else if periodTransactions.length === 0}
			<div class="flex h-full flex-col items-center justify-center p-4 text-center">
				<p class="text-[11px] text-[#787774]">{t('ledger.noTransactions')}</p>
				<button
					type="button"
					onclick={handleQuickAdd}
					class="mt-2 cursor-pointer text-[11px] font-medium text-[#111111] underline hover:text-[#787774]"
				>
					+ {t('ledger.planTransaction')}
				</button>
			</div>
		{:else}
			{#each periodTransactions as t (t.transactionId)}
				{@const isInc = t.transactionType === 'income'}
				{@const isPlan = t.transactionIsPlanned === 1}
				{@const curr = getWalletCurrency(t.transactionWalletId)}
				{@const amtIDR = getConvertedBalanceInIDR(t.transactionAmount, curr)}

				<button
					type="button"
					onclick={() => handleRowClick(t)}
					class="w-full cursor-pointer p-2.5 text-left transition-colors hover:bg-[#F9F9F8]"
				>
					<!-- Line 1: Date + Description + Amount -->
					<div class="flex items-center justify-between gap-1.5">
						<div class="flex min-w-0 items-center gap-1.5">
							<span class="shrink-0 font-mono text-[10px] text-[#787774]">
								{dFmt(t.transactionDate)}
							</span>
							<span
								class="truncate text-[11px] font-medium text-[#111111]"
								title={t.transactionDescription || ''}
							>
								{t.transactionDescription || '(tanpa deskripsi)'}
							</span>
						</div>

						<span
							class="shrink-0 font-mono text-xs font-semibold tabular-nums {isInc
								? 'text-[#346538]'
								: 'text-[#111111]'}"
						>
							{isInc ? '+' : '−'}{fmtIDR(amtIDR)}
						</span>
					</div>

					<!-- Line 2: Category + Wallet + Status Badge -->
					<div class="mt-1 flex items-center justify-between gap-1 text-[10px] text-[#787774]">
						<div class="flex items-center gap-1.5 truncate">
							<span
								class="py-0.2 max-w-[100px] truncate rounded bg-[#F0EFEC] px-1.5 font-medium text-[#111111]"
							>
								{getCategoryName(t.transactionCategoryId)}
							</span>
							<span class="max-w-[110px] truncate">
								{getWalletName(t.transactionWalletId)}
							</span>
						</div>

						<div class="flex shrink-0 items-center gap-1 font-mono text-[9px] uppercase">
							{#if isPlan}
								<span class="font-medium text-[#956400]">Planned</span>
							{:else}
								<span>Realized</span>
							{/if}
						</div>
					</div>
				</button>
			{/each}

			{#if hasNext}
				<div class="p-2 text-center">
					<button
						type="button"
						disabled={isLoadingMore}
						onclick={loadMore}
						class="w-full cursor-pointer rounded border border-[#EAEAEA] bg-[#F9F9F8] py-1.5 font-mono text-[11px] font-medium text-[#111111] transition-colors hover:border-[#111111] hover:bg-white disabled:opacity-50"
					>
						{isLoadingMore ? 'Memuat...' : `Muat Lebih Banyak (${periodTransactions.length} dari ${totalCount})`}
					</button>
				</div>
			{/if}
		{/if}
	</div>

	<!-- Period Summary Card -->
	<PeriodSummaryCard
		summary={{
			...periodSummary,
			income: localCashflow.income,
			expense: localCashflow.expense,
			net: localCashflow.net
		}}
	/>
</div>
