<script lang="ts">
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import BudgetCard from './BudgetCard.svelte';
	import ChartPieSlice from 'phosphor-svelte/lib/ChartPieSlice';
	import { t, i18nStore } from '$lib/i18n/index.svelte';

	const budgets = $derived(reedrichStore.activeBudgets);
</script>

<section id="sec-budgets" class="mb-5 rounded-xl border border-[#EAEAEA] bg-white p-5 md:p-6">
	<div
		class="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-[#EAEAEA] pb-3"
	>
		<div>
			<h2 class="serif flex items-center gap-2 text-xl font-medium text-[#111111] md:text-2xl">
				<ChartPieSlice class="size-5 text-[#111111]" weight="bold" />
				<span>{t('planning.budgets.title')}</span>
			</h2>
			<div class="mt-0.5 text-xs text-[#787774]">
				{i18nStore.locale === 'id'
					? 'Realisasi pengeluaran terhadap pagu bulanan. Klik untuk riwayat transaksi.'
					: 'Spending vs monthly allowances. Click to inspect transactions.'}
			</div>
		</div>

		<span
			class="rounded-full border border-[#EAEAEA] bg-[#F9F9F8] px-2.5 py-0.5 font-mono text-[11px] text-[#787774] uppercase"
		>
			{budgets.length}
			{i18nStore.locale === 'id' ? 'pagu' : 'budgets'}
		</span>
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		{#each budgets as budget (budget.budgetId)}
			<BudgetCard {budget} />
		{:else}
			<div class="col-span-1 py-6 text-center font-mono text-xs text-[#787774] md:col-span-2">
				{t('common.empty')}
			</div>
		{/each}
	</div>
</section>
