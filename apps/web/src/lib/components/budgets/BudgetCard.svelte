<script lang="ts">
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { fmtIDR } from '$lib/utils/currency';
	import ChartPieSlice from 'phosphor-svelte/lib/ChartPieSlice';
	import { t, i18nStore } from '$lib/i18n/index.svelte';
	import type { BudgetSnapshot } from '$lib/types/account-detail';

	let { budget }: { budget: BudgetSnapshot } = $props();

	const percent = $derived(budget.percentUsed || 0);
	const rawRemaining = $derived(budget.amount - budget.spent);
	const isOver = $derived(rawRemaining < 0 || percent >= 100);
	const isWarning = $derived(!isOver && percent >= 80);

	const statusLabel = $derived.by(() => {
		if (isOver) return t('planning.budgets.overBudget');
		if (isWarning) return t('planning.budgets.warning');
		return t('planning.budgets.onTrack');
	});

	const badgeClass = $derived(
		isOver
			? 'bg-[#FDEBEC] text-[#9F2F2D]'
			: isWarning
				? 'bg-[#FEF3C7] text-[#92400E]'
				: 'bg-[#EDF3EC] text-[#346538]'
	);

	const barColorClass = $derived(
		isOver ? 'bg-[#9F2F2D]' : isWarning ? 'bg-[#D97706]' : 'bg-[#111111]'
	);

	const headroomText = $derived.by(() => {
		if (isOver) {
			return t('planning.budgets.overLimitBy', { amount: fmtIDR(Math.abs(rawRemaining)) });
		}
		return t('planning.budgets.remainingToLimit', { amount: fmtIDR(Math.max(0, rawRemaining)) });
	});

	const headroomColorClass = $derived(
		isOver ? 'text-[#9F2F2D]' : isWarning ? 'text-[#92400E]' : 'text-[#346538]'
	);

	function handleClick() {
		reedrichStore.openDrawer({
			type: 'budget',
			title: budget.budgetName,
			subtitle: `${i18nStore.locale === 'id' ? 'Kategori' : 'Category'}: ${budget.categoryName || 'General'} · Status: ${statusLabel}`,
			badge: i18nStore.locale === 'id' ? 'BUDGET & PAGU' : 'BUDGET',
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
			<div class="min-w-0">
				<div class="flex items-center gap-2 text-sm font-semibold text-[#111111]">
					<ChartPieSlice class="size-4 shrink-0 text-[#787774]" weight="bold" />
					<span class="truncate">{budget.budgetName}</span>
				</div>
				<div class="mt-1 truncate text-xs text-[#787774]">
					{i18nStore.locale === 'id' ? 'Kategori' : 'Category'}: {budget.categoryName || 'General'}
				</div>
			</div>

			<div class="flex items-center gap-1.5 shrink-0">
				<span class="font-mono text-xs font-semibold tabular-nums text-[#111111]">
					{Math.round(percent)}%
				</span>
				<span
					class="rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase {badgeClass}"
				>
					{statusLabel}
				</span>
			</div>
		</div>

		<!-- Progress Bar Track -->
		<div class="my-3.5 h-2 w-full overflow-hidden rounded-full bg-[#F0EFEC]">
			<div
				class="h-full {barColorClass} transition-all duration-300"
				style="width: {Math.min(100, Math.max(0, percent))}%"
			></div>
		</div>

		<!-- Dual-Layer Metric Grid -->
		<div class="flex flex-wrap items-baseline justify-between gap-y-2 text-xs">
			<!-- Primary Headroom / Overrun Metric -->
			<div class="space-y-0.5">
				<div class="text-[10px] font-semibold uppercase tracking-wider text-[#787774]">
					{isOver ? t('planning.budgets.overrunLabel') : t('planning.budgets.headroomLabel')}
				</div>
				<div class="font-mono text-xs font-bold tabular-nums {headroomColorClass}">
					{headroomText}
				</div>
			</div>

			<!-- Secondary Spent vs Allowance Ratio -->
			<div class="space-y-0.5 text-right">
				<div class="text-[10px] font-semibold uppercase tracking-wider text-[#787774]">
					{t('planning.budgets.utilizationRatio')}
				</div>
				<div class="font-mono text-[11px] tabular-nums text-[#787774]">
					<span class="font-medium text-[#111111]">{fmtIDR(budget.spent)}</span> / {fmtIDR(budget.amount)}
				</div>
			</div>
		</div>
	</div>
</div>
