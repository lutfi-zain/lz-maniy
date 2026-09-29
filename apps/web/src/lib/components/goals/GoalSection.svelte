<script lang="ts">
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import GoalCard from './GoalCard.svelte';
	import Target from 'phosphor-svelte/lib/Target';
	import { t, i18nStore } from '$lib/i18n/index.svelte';

	const goals = $derived(reedrichStore.activeGoals);
</script>

<section id="sec-goals" class="mb-5 rounded-xl border border-[#EAEAEA] bg-white p-5 md:p-6">
	<div
		class="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-[#EAEAEA] pb-3"
	>
		<div>
			<h2 class="serif flex items-center gap-2 text-xl font-medium text-[#111111] md:text-2xl">
				<Target class="size-5 text-[#111111]" weight="bold" />
				<span>{t('planning.goals.title')}</span>
			</h2>
			<div class="mt-0.5 text-xs text-[#787774]">
				{i18nStore.locale === 'id' ? 'Pencapaian target otomatis yang dikonsolidasikan dari dompet terhubung.' : 'Savings progress derived automatically from linked accounts.'}
			</div>
		</div>

		<span
			class="rounded-full border border-[#EAEAEA] bg-[#F9F9F8] px-2.5 py-0.5 font-mono text-[11px] text-[#787774] uppercase"
		>
			{goals.length} {i18nStore.locale === 'id' ? 'target' : 'goals'}
		</span>
	</div>

	<div>
		{#each goals as goal (goal.goalId)}
			<GoalCard {goal} />
		{:else}
			<div class="py-6 text-center font-mono text-xs text-[#787774]">
				{t('common.empty')}
			</div>
		{/each}
	</div>
</section>
