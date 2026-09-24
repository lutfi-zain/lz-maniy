<script lang="ts">
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { fmtIDR } from '$lib/utils/currency';
	import ChartPieSlice from 'phosphor-svelte/lib/ChartPieSlice';
	import ArrowRight from 'phosphor-svelte/lib/ArrowRight';
	import type { BudgetSnapshot } from '$lib/types/account-detail';

	let { budget }: { budget: BudgetSnapshot } = $props();

	const p = $derived(budget.percentUsed || 0);

	function handleClick() {
		reedrichStore.openDrawer({
			type: 'budget',
			title: budget.budgetName,
			subtitle: `Kategori: ${budget.categoryName || 'General'} · Status: ${budget.status}`,
			badge: 'BUDGET & PAGU',
			data: { budget }
		});
		reedrichStore.fetchTransactionsForDrawer({ budgetId: budget.budgetId, limit: 50 });
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="group relative flex cursor-pointer flex-col justify-between rounded-lg border border-[#EAEAEA] bg-white p-4 transition-all duration-150 hover:border-[#C8C6BF] hover:shadow-xs"
	onclick={handleClick}
>
	<div>
		<div class="flex items-start justify-between gap-3">
			<div>
				<div class="flex items-center gap-2 text-sm font-semibold text-[#111111]">
					<ChartPieSlice class="size-4 text-[#787774]" weight="bold" />
					<span>{budget.budgetName}</span>
				</div>
				<div class="mt-1 text-xs text-[#787774]">
					Kategori: {budget.categoryName || 'General'}
				</div>
			</div>

			<span
				class="rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase {p > 90
					? 'bg-[#FDEBEC] text-[#9F2F2D]'
					: 'bg-[#EDF3EC] text-[#346538]'}"
			>
				{budget.status}
			</span>
		</div>

		<!-- Progress Bar -->
		<div class="my-3 h-2 w-full overflow-hidden rounded-full bg-[#F0EFEC]">
			<div class="h-full bg-[#111111] transition-all" style="width: {Math.min(100, p)}%"></div>
		</div>

		<div class="flex items-center justify-between text-xs">
			<span class="text-[#787774]">Terpakai {p}% ({fmtIDR(budget.spent)})</span>
			<span class="font-mono font-semibold text-[#111111]">Pagu {fmtIDR(budget.amount)}</span>
		</div>
	</div>

	<div
		class="mt-3 flex items-center gap-1 text-[11px] text-[#787774] transition-colors group-hover:text-[#111111]"
	>
		<ArrowRight class="size-3" weight="bold" />
		<span>Klik untuk melihat transaksi budget ini</span>
	</div>
</div>
