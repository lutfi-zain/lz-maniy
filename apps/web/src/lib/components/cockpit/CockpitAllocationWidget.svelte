<script lang="ts">
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { fmtIDR } from '$lib/utils/currency';
	import ChartBar from 'phosphor-svelte/lib/ChartBar';
	import ChartPieSlice from 'phosphor-svelte/lib/ChartPieSlice';
	import ArrowRight from 'phosphor-svelte/lib/ArrowRight';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';

	const cf = $derived(reedrichStore.snapshot?.monthlyCashFlow);
	const categories = $derived(cf?.categoryBreakdown?.slice(0, 6) ?? []);
	const budgets = $derived(reedrichStore.activeBudgets);
</script>

<div class="space-y-4 rounded-lg border border-[#EAEAEA] bg-white p-4 shadow-2xs">
	<!-- Expense Breakdown Block -->
	<div>
		<div class="mb-3 flex items-center justify-between border-b border-[#EAEAEA] pb-2">
			<div class="flex items-center gap-1.5">
				<ChartBar class="size-4 text-[#111111]" weight="bold" />
				<h3 class="text-xs font-semibold text-[#111111]">Alokasi Pengeluaran Terbesar</h3>
			</div>
			<span class="font-mono text-[10px] text-[#787774]">Top 6</span>
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
				<h3 class="text-xs font-semibold text-[#111111]">Pagu Anggaran</h3>
			</div>
			<a
				href="/planning"
				class="flex items-center gap-1 text-[11px] font-medium text-[#787774] no-underline transition-colors hover:text-[#111111]"
			>
				<span>Kelola</span>
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
					<div class="rounded border border-[#EAEAEA] bg-[#F9F9F8] p-2.5 text-xs">
						<div class="flex items-center justify-between font-semibold text-[#111111]">
							<span class="truncate">{b.budgetName}</span>
							<span class="font-mono text-[11px] font-normal">{p}%</span>
						</div>
						<div class="my-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#F0EFEC]">
							<div class="h-full bg-[#111111]" style="width: {Math.min(100, p)}%"></div>
						</div>
						<div class="flex items-center justify-between text-[11px] text-[#787774]">
							<span>Terpakai {fmtIDR(b.spent)}</span>
							<span class="font-mono text-[#346538]">Sisa {fmtIDR(b.remaining)}</span>
						</div>
					</div>
				{:else}
					<div class="py-2 font-mono text-[11px] text-[#787774]">Tidak ada pagu aktif.</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
