<script lang="ts">
	import { fmtIDR } from '$lib/utils/currency';
	import Target from 'phosphor-svelte/lib/Target';

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
	<!-- Layer 1: Cashflow Metrics -->
	<div class="space-y-1.5 border-b border-[#EAEAEA] pb-2.5">
		<div class="flex items-center justify-between text-[10px] font-semibold tracking-wider text-[#787774] uppercase">
			<span>Arus Kas Bulan Ini</span>
			<span
				class="font-mono font-bold {summary.net >= 0
					? 'text-[#346538]'
					: 'text-[#9F2F2D]'}"
			>
				{summary.net >= 0 ? '+' : '−'}{fmtIDR(Math.abs(summary.net))}
			</span>
		</div>

		<div class="flex items-center justify-between font-mono text-[11px] tabular-nums">
			<span class="text-[#787774]">
				Masuk: <span class="font-medium text-[#346538]">+{fmtIDR(summary.income)}</span>
			</span>
			<span class="text-[#787774]">
				Keluar: <span class="font-medium text-[#111111]">−{fmtIDR(summary.expense)}</span>
			</span>
		</div>
	</div>

	<!-- Layer 2: Point-in-Time Net Worth -->
	<div class="space-y-1 border-b border-[#EAEAEA] pb-2.5">
		<div class="flex items-center justify-between">
			<span class="text-[10px] font-semibold tracking-wider text-[#787774] uppercase">
				{summary.label || 'PROYEKSI NET WORTH'}
			</span>
			<span class="font-mono text-sm font-bold text-[#111111] tabular-nums">
				{fmtIDR(summary.closingNetWorth)}
			</span>
		</div>

		<div class="flex items-center justify-between font-mono text-[10px] text-[#787774]">
			<span class="flex items-center gap-1 text-[#346538]">
				<span class="size-1.5 rounded-full bg-[#346538]"></span>
				<span>Bebas: {fmtIDR(summary.spendable)}</span>
			</span>
			<span class="flex items-center gap-1 text-[#956400]">
				<span class="size-1.5 rounded-full bg-[#956400]"></span>
				<span>Cadangan: {fmtIDR(summary.locked)}</span>
			</span>
		</div>
	</div>

	<!-- Layer 3: Snapshot Goals -->
	<div class="space-y-2">
		<div class="flex items-center gap-1 text-[10px] font-semibold tracking-wider text-[#787774] uppercase">
			<Target class="size-3 text-[#787774]" weight="bold" />
			<span>Snapshot Goals</span>
		</div>

		{#if summary.goalSnapshots.length === 0}
			<div class="py-1 text-[11px] text-[#787774]">
				Tidak ada target tabungan aktif.
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
									Tercapai!
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
</div>
