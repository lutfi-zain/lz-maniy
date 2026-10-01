<script lang="ts">
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { fmtIDR } from '$lib/utils/currency';
	import { t } from '$lib/i18n/index.svelte';
	import WarningCircle from 'phosphor-svelte/lib/WarningCircle';
	import ArrowRight from 'phosphor-svelte/lib/ArrowRight';

	const summary = $derived(reedrichStore.summary);
	const isDeficit = $derived(summary?.safeToSpendDetails?.isDeficit ?? false);
	const safeToSpend = $derived(summary?.safeToSpend ?? 0);
	const dailySafe = $derived(summary?.dailySafeToSpend ?? 0);
	const remainingDays = $derived(summary?.safeToSpendDetails?.remainingDays ?? 0);
	const plannedDeducted = $derived(summary?.safeToSpendDetails?.plannedExpensesDeducted ?? 0);

	// Fallback/secondary priority: check most critical goal with deficit and nearest due date
	const goals = $derived(reedrichStore.activeGoals);
	const criticalGoal = $derived.by(() => {
		const unreached = goals.filter((g) => g.currentAmount < g.targetAmount);
		if (unreached.length === 0) return null;
		return unreached.sort((a, b) => (a.daysRemaining ?? 999) - (b.daysRemaining ?? 999))[0];
	});
	const goalDeficit = $derived(
		criticalGoal ? Math.max(0, criticalGoal.targetAmount - criticalGoal.currentAmount) : 0
	);
</script>

{#if isDeficit}
	<!-- Priority 1: Safe-to-Spend Runway Deficit Alert -->
	<div
		class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#FDEBEC] bg-[#FFFBFB] px-4 py-3 text-xs"
	>
		<div class="flex items-center gap-2.5">
			<WarningCircle class="size-4 shrink-0 text-[#9F2F2D]" weight="bold" />
			<div>
				<span class="font-semibold text-[#9F2F2D]">Peringatan Runway Defisit:</span>
				<span class="ml-1 text-[#787774]">
					Komitmen tagihan terencana ({fmtIDR(plannedDeducted)}) melebihi kas aman belanja. Defisit
					<strong class="font-mono text-[#9F2F2D]">{fmtIDR(safeToSpend)}</strong>
					{#if remainingDays > 0}
						(alokasi harian <span class="font-mono">{fmtIDR(dailySafe)}/hari</span> untuk {remainingDays} hari sisa).
					{/if}
				</span>
			</div>
		</div>

		<a
			href="/planning"
			class="flex items-center gap-1 text-xs font-medium text-[#9F2F2D] no-underline transition-colors hover:text-[#111111]"
		>
			<span>{t('cockpit.viewAccountAllocation')}</span>
			<ArrowRight class="size-3" weight="bold" />
		</a>
	</div>
{:else if criticalGoal && goalDeficit > 0 && (criticalGoal.daysRemaining ?? 99) <= 30}
	<!-- Priority 2: Critical Goal Pacing Alert (Dynamic, without hardcoded names) -->
	<div
		class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#FBF3DB] bg-[#FDFCF7] px-4 py-3 text-xs"
	>
		<div class="flex items-center gap-2.5">
			<WarningCircle class="size-4 shrink-0 text-[#956400]" weight="bold" />
			<div>
				<span class="font-semibold text-[#111111]">Pacing Alert: {criticalGoal.goalName}</span>
				<span class="ml-1 text-[#787774]">
					jatuh tempo <strong class="text-[#111111]">{criticalGoal.daysRemaining ?? 21} hari lagi</strong>. Terkumpul
					<span class="font-mono font-medium text-[#111111]">{fmtIDR(criticalGoal.currentAmount)}</span>
					dari <span class="font-mono">{fmtIDR(criticalGoal.targetAmount)}</span> (Kurang
					<span class="font-mono font-semibold text-[#9F2F2D]">{fmtIDR(goalDeficit)}</span>).
				</span>
			</div>
		</div>

		<a
			href="/planning"
			class="flex items-center gap-1 text-xs font-medium text-[#956400] no-underline transition-colors hover:text-[#111111]"
		>
			<span>{t('cockpit.viewAccountAllocation')}</span>
			<ArrowRight class="size-3" weight="bold" />
		</a>
	</div>
{/if}
