<script lang="ts">
	import { reedrichStore } from '$lib/stores/reedrich.svelte.js';
	import { transactionFormStore } from '$lib/stores/transaction-form.svelte.js';
	import { settingsStore } from '$lib/stores/settings.svelte.js';
	import { fmtIDR, getConvertedBalanceInIDR } from '$lib/utils/currency';
	import { dFmt } from '$lib/utils/dates';
	import Plus from 'phosphor-svelte/lib/Plus';
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
	const periodTitle = $derived.by(() => {
		const [y, m] = periodKey.split('-');
		const monthNames = [
			'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
			'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
		];
		const idx = parseInt(m, 10) - 1;
		return `${monthNames[idx] || m} ${y}`;
	});

	const allTxs = $derived(reedrichStore.allTransactions);
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

	// Filtered transactions for this specific period column
	const periodTransactions = $derived.by(() => {
		const q = globalFilters.searchKeyword.trim().toLowerCase();

		return allTxs.filter((t) => {
			// Date filter for this column
			const txDate = t.transactionDate.slice(0, 10);
			if (txDate < startDate || txDate > endDate) return false;

			// Type filter
			if (globalFilters.type !== 'all' && t.transactionType !== globalFilters.type) return false;

			// Status filter
			if (globalFilters.status === 'realized' && t.transactionIsPlanned !== 0) return false;
			if (globalFilters.status === 'planned' && t.transactionIsPlanned !== 1) return false;

			// Wallet filter
			if (globalFilters.walletIds.length > 0) {
				const isSource = globalFilters.walletIds.includes(t.transactionWalletId);
				const isTarget = t.transactionTargetWalletId
					? globalFilters.walletIds.includes(t.transactionTargetWalletId)
					: false;
				if (!isSource && !isTarget) return false;
			}

			// Category filter
			if (globalFilters.categoryIds.length > 0) {
				if (!t.transactionCategoryId || !globalFilters.categoryIds.includes(t.transactionCategoryId)) {
					return false;
				}
			}

			// Budget filter
			if (globalFilters.budgetIds.length > 0) {
				if (!t.transactionBudgetId || !globalFilters.budgetIds.includes(t.transactionBudgetId)) {
					return false;
				}
			}

			// Search keyword
			if (q) {
				const desc = (t.transactionDescription || '').toLowerCase();
				const id = (t.transactionId || '').toLowerCase();
				if (!desc.includes(q) && !id.includes(q)) return false;
			}

			return true;
		});
	});

	function handleQuickAdd() {
		// Use today if inside this period, else 1st day of period
		const todayIso = new Date().toISOString().slice(0, 10);
		const initialDate = todayIso >= startDate && todayIso <= endDate ? todayIso : startDate;
		transactionFormStore.openCreate();
		transactionFormStore.date = initialDate;
	}

	function handleRowClick(t: TransactionRecord) {
		transactionFormStore.openView(t);
	}
</script>

<div class="flex flex-col rounded-lg border border-[#EAEAEA] bg-white shadow-2xs">
	<!-- Period Header -->
	<div class="flex items-center justify-between border-b border-[#EAEAEA] bg-[#FDFCFB] px-3.5 py-2.5">
		<div>
			<h2 class="text-xs font-semibold text-[#111111]">{periodTitle}</h2>
			<span class="text-[10px] text-[#787774] font-mono">
				{periodTransactions.length} transaksi
			</span>
		</div>

		<div class="flex items-center gap-1">
			<button
				type="button"
				onclick={handleQuickAdd}
				class="flex size-6 cursor-pointer items-center justify-center rounded bg-[#111111] text-white transition-colors hover:bg-[#333333] active:scale-95"
				title="Catat transaksi di bulan ini"
				aria-label="Catat transaksi di bulan ini"
			>
				<Plus class="size-3.5" weight="bold" />
			</button>

			{#if canRemove}
				<button
					type="button"
					onclick={() => settingsStore.removePeriod(periodKey)}
					class="flex size-6 cursor-pointer items-center justify-center rounded text-[#787774] transition-colors hover:bg-[#F0EFEC] hover:text-[#9F2F2D] active:scale-95"
					title="Hapus periode dari board"
					aria-label="Hapus periode dari board"
				>
					<Trash class="size-3.5" weight="bold" />
				</button>
			{/if}
		</div>
	</div>

	<!-- Dense Ledger Table -->
	<div class="h-[320px] overflow-y-auto divide-y divide-[#EAEAEA] text-xs">
		{#if reedrichStore.isLedgerLoading && periodTransactions.length === 0}
			<div class="space-y-3 p-3.5">
				{#each [0, 1, 2, 3, 4] as i (i)}
					<div class="space-y-1.5 py-1">
						<div class="flex items-center justify-between gap-2">
							<Skeleton class="h-3 w-14 shrink-0" />
							<Skeleton class="h-3 flex-1 max-w-[140px]" />
							<Skeleton class="h-3 w-20 shrink-0 text-right" />
						</div>
						<div class="flex items-center justify-between">
							<Skeleton class="h-2.5 w-16" />
							<Skeleton class="h-2.5 w-12" />
						</div>
					</div>
				{/each}
			</div>
		{:else if periodTransactions.length === 0}
			<div class="flex h-full flex-col items-center justify-center p-4 text-center">
				<p class="text-[11px] text-[#787774]">Belum ada transaksi di periode ini.</p>
				<button
					type="button"
					onclick={handleQuickAdd}
					class="mt-2 cursor-pointer text-[11px] font-medium text-[#111111] underline hover:text-[#787774]"
				>
					+ Rencanakan Transaksi
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
						<div class="flex items-center gap-1.5 min-w-0">
							<span class="font-mono text-[10px] text-[#787774] shrink-0">
								{dFmt(t.transactionDate)}
							</span>
							<span
								class="truncate font-medium text-[#111111] text-[11px]"
								title={t.transactionDescription || ''}
							>
								{t.transactionDescription || '(tanpa deskripsi)'}
							</span>
						</div>

						<span
							class="font-mono text-xs font-semibold tabular-nums shrink-0 {isInc
								? 'text-[#346538]'
								: 'text-[#111111]'}"
						>
							{isInc ? '+' : '−'}{fmtIDR(amtIDR)}
						</span>
					</div>

					<!-- Line 2: Category + Wallet + Status Badge -->
					<div class="mt-1 flex items-center justify-between gap-1 text-[10px] text-[#787774]">
						<div class="flex items-center gap-1.5 truncate">
							<span class="rounded bg-[#F0EFEC] px-1.5 py-0.2 font-medium text-[#111111] truncate max-w-[100px]">
								{getCategoryName(t.transactionCategoryId)}
							</span>
							<span class="truncate max-w-[110px]">
								{getWalletName(t.transactionWalletId)}
							</span>
						</div>

						<div class="flex items-center gap-1 shrink-0 font-mono text-[9px] uppercase">
							{#if isPlan}
								<span class="text-[#956400] font-medium">Planned</span>
							{:else}
								<span>Realized</span>
							{/if}
						</div>
					</div>
				</button>
			{/each}
		{/if}
	</div>

	<!-- Period Summary Card -->
	<PeriodSummaryCard summary={periodSummary} />
</div>
