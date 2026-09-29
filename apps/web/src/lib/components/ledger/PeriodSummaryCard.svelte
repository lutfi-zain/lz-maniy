<script lang="ts">
	import { fmtIDR } from '$lib/utils/currency';
	import Target from 'phosphor-svelte/lib/Target';
	import { t, i18nStore } from '$lib/i18n/index.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import { reedrichStore } from '$lib/stores/reedrich.svelte.js';

	export interface GoalProjection {
		goalId: string;
		goalName: string;
		targetAmount: number;
		currentAmount: number;
		progressPercentage: number;
		isMilestone?: boolean;
	}

	export interface PeriodSummary {
		periodKey: string;
		startDate: string;
		endDate: string;
		income: number;
		expense: number;
		net: number;
		closingNetWorth: number;
		spendable: number;
		locked: number;
		goalSnapshots: GoalProjection[];
		label?: string;
	}

	let { summary }: { summary: PeriodSummary } = $props();
</script>

<div class="space-y-3 rounded-b-lg border-t border-[#EAEAEA] bg-[#FDFCFB] p-3 text-xs">
	{#if reedrichStore.isLedgerLoading && (!summary || !summary.closingNetWorth)}
		<!-- Skeleton state for summary card -->
		<div class="space-y-1 border-b border-[#EAEAEA] pb-2">
			<div class="flex justify-between">
				<Skeleton class="h-2.5 w-20" />
				<Skeleton class="h-3 w-16" />
			</div>
			<div class="flex justify-between">
				<Skeleton class="h-2.5 w-16" />
				<Skeleton class="h-2.5 w-24" />
			</div>
			<div class="flex justify-between">
				<Skeleton class="h-2.5 w-16" />
				<Skeleton class="h-2.5 w-24" />
			</div>
		</div>
		<div class="space-y-1 border-b border-[#EAEAEA] pb-2">
			<div class="flex justify-between">
				<Skeleton class="h-2.5 w-28" />
				<Skeleton class="h-3 w-24" />
			</div>
			<div class="flex justify-between">
				<Skeleton class="h-2.5 w-24" />
				<Skeleton class="h-2.5 w-20" />
			</div>
			<div class="flex justify-between">
				<Skeleton class="h-2.5 w-24" />
				<Skeleton class="h-2.5 w-20" />
			</div>
		</div>
		<div class="space-y-2">
			<Skeleton class="h-2.5 w-20" />
			<Skeleton class="h-10 w-full rounded" />
		</div>
	{:else}
		<!-- Layer 1: Cashflow Metrics -->
		<div class="space-y-1 border-b border-[#EAEAEA] pb-2">
			<div class="flex items-center justify-between text-[10px] font-semibold tracking-wider text-[#787774] uppercase">
				<span>{t('cockpit.netCashflow')}</span>
				<span
					class="font-mono text-xs font-bold {summary.net >= 0
						? 'text-[#346538]'
						: 'text-[#9F2F2D]'}"
				>
					{summary.net >= 0 ? '+' : '−'}{fmtIDR(Math.abs(summary.net))}
				</span>
			</div>

			<div class="flex items-center justify-between font-mono text-[10px] text-[#787774]">
				<span>{t('ledger.summary.inflow')}</span>
				<span class="font-medium text-[#346538] tabular-nums">+{fmtIDR(summary.income)}</span>
			</div>
			<div class="flex items-center justify-between font-mono text-[10px] text-[#787774]">
				<span>{t('ledger.summary.outflow')}</span>
				<span class="font-medium text-[#111111] tabular-nums">−{fmtIDR(summary.expense)}</span>
			</div>
		</div>

		<!-- Layer 2: Point-in-Time Net Worth -->
		<div class="space-y-1 border-b border-[#EAEAEA] pb-2">
			<div class="flex items-center justify-between">
				<span class="text-[10px] font-semibold tracking-wider text-[#787774] uppercase">
					{summary.label || 'PROYEKSI NET WORTH'}
				</span>
				<span class="font-mono text-xs font-bold text-[#111111] tabular-nums">
					{fmtIDR(summary.closingNetWorth)}
				</span>
			</div>

			<div class="flex items-center justify-between font-mono text-[10px] text-[#787774]">
				<span class="flex items-center gap-1.5">
					<span class="size-1.5 rounded-full bg-[#346538]"></span>
					<span>{t('ledger.summary.spendable')}</span>
				</span>
				<span class="font-medium text-[#346538] tabular-nums">{fmtIDR(summary.spendable)}</span>
			</div>
			<div class="flex items-center justify-between font-mono text-[10px] text-[#787774]">
				<span class="flex items-center gap-1.5">
					<span class="size-1.5 rounded-full bg-[#956400]"></span>
					<span>{t('ledger.summary.locked')}</span>
				</span>
				<span class="font-medium text-[#956400] tabular-nums">{fmtIDR(summary.locked)}</span>
			</div>
		</div>

	<!-- Layer 3: Snapshot Goals -->
	<div class="space-y-2">
		<div class="flex items-center gap-1 text-[10px] font-semibold tracking-wider text-[#787774] uppercase">
			<Target class="size-3 text-[#787774]" weight="bold" />
			<span>{t('ledger.summary.goalsProgress')}</span>
		</div>

		{#if summary.goalSnapshots.length === 0}
			<div class="py-1 text-[11px] text-[#787774]">
				{t('ledger.summary.noGoals')}
			</div>
		{:else}
			<div class="space-y-1.5">
				{#each summary.goalSnapshots as goal (goal.goalId)}
					{@const pct = Math.min(100, Math.round(goal.progressPercentage))}
					<div class="flex flex-col gap-1 rounded border border-[#EAEAEA] bg-white p-2">
						<div class="flex items-center justify-between gap-1 text-[11px]">
							<span class="truncate font-medium text-[#111111]">{goal.goalName}</span>
							{#if goal.isMilestone}
								<span class="shrink-0 rounded bg-[#EDF3EC] px-1 py-0.2 font-mono text-[9px] font-bold text-[#346538]">
									{i18nStore.locale === 'id' ? 'Tercapai!' : 'Reached!'}
								</span>
							{:else}
								<span class="shrink-0 font-mono text-[10px] font-semibold text-[#787774]">
									{pct}%
								</span>
							{/if}
						</div>

						<!-- Progress track -->
						<div class="h-1.5 w-full overflow-hidden rounded-full bg-[#F0EFEC]">
							<div
								class="h-full rounded-full transition-all duration-300 {goal.isMilestone
									? 'bg-[#346538]'
									: 'bg-[#956400]'}"
								style="width: {pct}%"
							></div>
						</div>

						<div class="flex items-center justify-between font-mono text-[9px] text-[#787774]">
							<span>{fmtIDR(goal.currentAmount)}</span>
							<span>{fmtIDR(goal.targetAmount)}</span>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
	{/if}
</div>
