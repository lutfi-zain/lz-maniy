<script lang="ts">
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { fmtIDR } from '$lib/utils/currency';
	import { resolveBudgetPeriod } from '$lib/utils/lifecycle';
	import { dateFilterStore } from '$lib/stores/date-filter.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import ChartBar from 'phosphor-svelte/lib/ChartBar';
	import ChartPieSlice from 'phosphor-svelte/lib/ChartPieSlice';
	import ArrowRight from 'phosphor-svelte/lib/ArrowRight';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';

	const cf = $derived(reedrichStore.snapshot?.monthlyCashFlow);
	const categories = $derived(cf?.categoryBreakdown?.slice(0, 6) ?? []);

	// If viewing a specific date range (e.g. Bulan Lalu / Sep 2026), anchor referenceDate to that timeframe
	const referenceDate = $derived.by(() => {
		if (dateFilterStore.endDate) {
			const d = new Date(dateFilterStore.endDate);
			if (!isNaN(d.getTime())) return d;
		}
		return new Date();
	});

	const budgets = $derived(
		(reedrichStore.activeBudgets ?? []).filter((b) => {
			// If backend account-detail was explicitly queried for a date range and returned this budget, display it;
			// Otherwise check if it is active against the reference date.
			if (dateFilterStore.preset !== 'this_month' && dateFilterStore.preset !== 'all') {
				return true;
			}
			return resolveBudgetPeriod(b, referenceDate).isActive;
		})
	);

	function getStatusBadge(status?: string, percentUsed = 0) {
		switch (status) {
			case 'exceeded':
				return { label: 'Melebihi', class: 'bg-[#FDEBEC] text-[#9F2F2D]' };
			case 'warning':
				return { label: 'Mendekati', class: 'bg-[#FBF3DB] text-[#956400]' };
			case 'completed':
				return { label: 'Selesai', class: 'bg-[#EFEFED] text-[#787774]' };
			case 'upcoming':
				return { label: 'Akan Datang', class: 'bg-[#E1F3FE] text-[#1F6C9F]' };
			case 'on_track':
			default:
				if (percentUsed >= 100) return { label: 'Melebihi', class: 'bg-[#FDEBEC] text-[#9F2F2D]' };
				if (percentUsed >= 80) return { label: 'Mendekati', class: 'bg-[#FBF3DB] text-[#956400]' };
				return { label: 'Terkendali', class: 'bg-[#EDF3EC] text-[#346538]' };
		}
	}

	function handleBudgetClick(b: (typeof budgets)[0]) {
		const badge = getStatusBadge(b.status, b.percentUsed || 0);
		reedrichStore.openDrawer({
			type: 'budget',
			title: b.budgetName,
			subtitle: `Kategori: ${b.categoryName || 'General'} · Status: ${badge.label}`,
			badge: 'BUDGET & PAGU',
			data: { budget: b }
		});
		reedrichStore.fetchTransactionsForDrawer({ budgetId: b.budgetId, limit: 50 });
	}
</script>

<div class="space-y-4 rounded-lg border border-[#EAEAEA] bg-white p-4 shadow-2xs">
	<!-- Expense Breakdown Block -->
	<div>
		<div class="mb-3 flex items-center justify-between border-b border-[#EAEAEA] pb-2">
			<div class="flex items-center gap-1.5">
				<ChartBar class="size-4 text-[#111111]" weight="bold" />
				<h3 class="text-xs font-semibold text-[#111111]">{t('cockpit.topExpenses')}</h3>
			</div>
			<span class="font-mono text-[10px] text-[#787774]">{t('cockpit.topCount', { count: 6 })}</span
			>
		</div>

		{#if reedrichStore.isLoading}
			<div class="space-y-3">
				{#each [0, 1, 2, 3] as i (i)}
					<div class="space-y-1.5">
						<div class="flex justify-between">
							<Skeleton class="h-3 w-28" />
							<Skeleton class="h-3 w-16" />
						</div>
						<Skeleton class="h-1.5 w-full rounded-full" />
					</div>
				{/each}
			</div>
		{:else}
			<div class="space-y-2">
				{#each categories as c (c.categoryName)}
					<a
						href="/ledger?category={encodeURIComponent(c.categoryName)}"
						class="group block no-underline"
					>
						<div class="mb-1 flex items-center justify-between text-xs">
							<span class="max-w-[150px] truncate text-[#111111] group-hover:underline">
								{c.categoryName}
							</span>
							<span class="font-mono text-[11px] text-[#787774] tabular-nums">
								{fmtIDR(c.amount)} ({c.percentage}%)
							</span>
						</div>
						<div class="h-1.5 w-full overflow-hidden rounded-full bg-[#F0EFEC]">
							<div
								class="h-full bg-[#111111] transition-all"
								style="width: {Math.min(100, c.percentage * 2.8)}%"
							></div>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Active Budgets Summary Block -->
	<div class="border-t border-[#EAEAEA] pt-3">
		<div class="mb-2 flex items-center justify-between pb-2">
			<div class="flex items-center gap-1.5">
				<ChartPieSlice class="size-4 text-[#111111]" weight="bold" />
				<h3 class="text-xs font-semibold text-[#111111]">{t('cockpit.budgets')}</h3>
			</div>
			<a
				href="/planning"
				class="flex items-center gap-1 text-[11px] font-medium text-[#787774] no-underline transition-colors hover:text-[#111111]"
			>
				<span>{t('common.viewAll')}</span>
				<ArrowRight class="size-3" weight="bold" />
			</a>
		</div>

		{#if reedrichStore.isLoading}
			<div class="space-y-3">
				{#each [0, 1] as i (i)}
					<div class="space-y-1.5">
						<div class="flex justify-between">
							<Skeleton class="h-3 w-32" />
							<Skeleton class="h-3 w-14" />
						</div>
						<Skeleton class="h-1.5 w-full rounded-full" />
					</div>
				{/each}
			</div>
		{:else}
			<div class="space-y-2.5">
				{#each budgets as b (b.budgetId)}
					{@const p = b.percentUsed || 0}
					{@const badge = getStatusBadge(b.status, p)}
					<button
						type="button"
						onclick={() => handleBudgetClick(b)}
						class="group w-full cursor-pointer rounded border border-[#EAEAEA] bg-[#F9F9F8] p-2.5 text-left text-xs transition-colors hover:border-[#C8C6BF] hover:bg-white"
					>
						<div class="flex items-center justify-between gap-2">
							<div class="flex min-w-0 items-center gap-1.5">
								<span class="truncate font-semibold text-[#111111] group-hover:underline">
									{b.budgetName}
								</span>
								<span
									class="py-0.2 shrink-0 rounded-full px-1.5 font-mono text-[9px] font-semibold tracking-wider uppercase {badge.class}"
								>
									{badge.label}
								</span>
							</div>
							<span class="shrink-0 font-mono text-[11px] font-medium text-[#111111] tabular-nums">
								{p}%
							</span>
						</div>
						<div class="my-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#F0EFEC]">
							<div
								class="h-full transition-all {p >= 100
									? 'bg-[#9F2F2D]'
									: p >= 80
										? 'bg-[#956400]'
										: 'bg-[#111111]'}"
								style="width: {Math.min(100, p)}%"
							></div>
						</div>
						<div class="flex items-center justify-between font-mono text-[11px] text-[#787774]">
							<span>Terpakai {fmtIDR(b.spent)}</span>
							<span class={p >= 100 ? 'text-[#9F2F2D]' : 'text-[#346538]'}>
								Sisa {fmtIDR(b.remaining)}
							</span>
						</div>
					</button>
				{:else}
					<div class="py-2 font-mono text-[11px] text-[#787774]">Tidak ada pagu aktif.</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
