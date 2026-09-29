<script lang="ts">
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { fmtIDR, fmtCurrency } from '$lib/utils/currency';
	import Target from 'phosphor-svelte/lib/Target';
	import { t, i18nStore } from '$lib/i18n/index.svelte';
	import ArrowRight from 'phosphor-svelte/lib/ArrowRight';
	import type { GoalSnapshot } from '$lib/types/account-detail';

	let { goal }: { goal: GoalSnapshot } = $props();

	const p = $derived(Math.round(goal.progressPercentage || 0));
	const linked = $derived(goal.linkedWalletsBreakdown ?? []);
	const remainingToTarget = $derived(Math.max(0, goal.targetAmount - goal.currentAmount));
	const isTargetReached = $derived(goal.currentAmount >= goal.targetAmount);

	function handleClick() {
		reedrichStore.openDrawer({
			type: 'goal',
			title: goal.goalName,
			subtitle: `${goal.daysRemaining !== null ? t('planning.goals.remainingDays', { days: goal.daysRemaining }) : (i18nStore.locale === 'id' ? 'Jangka panjang' : 'Long term')} ${goal.isDerived ? '· Derived' : ''}`,
			badge: i18nStore.locale === 'id' ? 'TARGET TABUNGAN' : 'SAVINGS GOAL',
			data: { goal }
		});
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="group relative mb-3 flex cursor-pointer flex-col justify-between rounded-lg border border-[#EAEAEA] bg-white p-4 transition-all duration-150 last:mb-0 hover:border-[#C8C6BF] hover:shadow-xs"
	onclick={handleClick}
>
	<div>
		<div class="flex items-start justify-between gap-3">
			<div>
				<div class="flex items-center gap-2 text-sm font-semibold text-[#111111]">
					<Target class="size-4 text-[#787774]" weight="bold" />
					<span>{goal.goalName}</span>
				</div>
				<div class="mt-1 text-xs text-[#787774]">
					{goal.daysRemaining !== null ? t('planning.goals.remainingDays', { days: goal.daysRemaining }) : (i18nStore.locale === 'id' ? 'Jangka panjang' : 'Long term')}
					{#if goal.isDerived}
						· <span class="font-mono text-[10px] text-[#787774] uppercase"
							>Derived ({linked.length} {i18nStore.locale === 'id' ? 'dompet' : 'accounts'})</span
						>
					{/if}
				</div>
			</div>

			<span
				class="rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase {p >= 75
					? 'bg-[#EDF3EC] text-[#346538]'
					: 'bg-[#EFEFED] text-[#111111]'}"
			>
				{p}%
			</span>
		</div>

		<!-- Progress Bar -->
		<div class="my-3 h-2 w-full overflow-hidden rounded-full bg-[#F0EFEC]">
			<div
				class="h-full {p >= 100 ? 'bg-[#346538]' : 'bg-[#111111]'} transition-all"
				style="width: {Math.min(100, p)}%"
			></div>
		</div>

		<!-- Goal Headroom & Pacing Metrics -->
		<div class="flex flex-wrap items-baseline justify-between gap-y-1.5 text-xs">
			<div class="space-y-0.5">
				<div class="text-[10px] font-semibold uppercase tracking-wider text-[#787774]">
					{t('planning.goals.remainingHeadroom')}
				</div>
				<div class="font-mono text-xs font-bold tabular-nums {isTargetReached ? 'text-[#346538]' : 'text-[#111111]'}">
					{#if isTargetReached}
						<span class="text-[#346538]">{t('planning.goals.targetReached')} ✓</span>
					{:else}
						{t('planning.goals.remainingToTarget', { amount: fmtIDR(remainingToTarget) })} <span class="font-normal text-[#787774]">({100 - p}%)</span>
					{/if}
				</div>
			</div>

			<div class="space-y-0.5 text-right font-mono tabular-nums">
				<div class="text-[10px] font-semibold uppercase tracking-wider text-[#787774]">
					{t('planning.goals.target')}
				</div>
				<div class="text-xs font-semibold text-[#111111]">
					{fmtIDR(goal.targetAmount)}
				</div>
			</div>
		</div>

		<!-- Linked Wallets Mini Breakdown -->
		{#if linked.length > 0}
			<div class="mt-3 border-t border-dashed border-[#EAEAEA] pt-2.5 text-[11px]">
				<table class="w-full border-collapse">
					<tbody>
						{#each linked as lw (lw.walletId)}
							<tr class="border-b border-black/5 last:border-b-0">
								<td class="max-w-[140px] truncate py-1 text-[#787774]">{lw.walletName}</td>
								<td class="py-1 text-right font-mono text-[#2F3437]">
									{#if lw.currency !== 'IDR'}
										<span class="text-[#787774]">{fmtCurrency(lw.balance, lw.currency)} ≈ </span>
									{/if}
									<span>{fmtIDR(lw.convertedAmount)}</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<div
		class="mt-3 flex items-center gap-1 text-[11px] text-[#787774] transition-colors group-hover:text-[#111111]"
	>
		<ArrowRight class="size-3" weight="bold" />
		<span>{i18nStore.locale === 'id' ? 'Klik untuk melihat rincian & mutasi goal' : 'Click to inspect goal details & transactions'}</span>
	</div>
</div>
