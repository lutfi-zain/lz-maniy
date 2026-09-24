<script lang="ts">
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { fmtIDR } from '$lib/utils/currency';
	import WarningCircle from 'phosphor-svelte/lib/WarningCircle';
	import ArrowRight from 'phosphor-svelte/lib/ArrowRight';

	const goals = $derived(reedrichStore.activeGoals);
	const sewaGoal = $derived(goals.find((g) => g.goalName.toLowerCase().includes('sewa rumah')));
	const deficit = $derived(
		sewaGoal ? Math.max(0, sewaGoal.targetAmount - sewaGoal.currentAmount) : 0
	);
</script>

{#if sewaGoal && deficit > 0}
	<div
		class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#FBF3DB] bg-[#FDFCF7] px-4 py-3 text-xs"
	>
		<div class="flex items-center gap-2.5">
			<WarningCircle class="size-4 shrink-0 text-[#956400]" weight="bold" />
			<div>
				<span class="font-semibold text-[#111111]">Pacing Alert: {sewaGoal.goalName}</span>
				<span class="ml-1 text-[#787774]">
					jatuh tempo <strong class="text-[#111111]"
						>{sewaGoal.daysRemaining ?? 21} hari lagi</strong
					>. Terkumpul
					<span class="font-mono font-medium text-[#111111]">{fmtIDR(sewaGoal.currentAmount)}</span>
					dari <span class="font-mono">{fmtIDR(sewaGoal.targetAmount)}</span> (Kurang
					<span class="font-mono font-semibold text-[#9F2F2D]">{fmtIDR(deficit)}</span>).
				</span>
			</div>
		</div>

		<a
			href="/planning"
			class="flex items-center gap-1 text-xs font-medium text-[#956400] no-underline transition-colors hover:text-[#111111]"
		>
			<span>Lihat Alokasi Dompet</span>
			<ArrowRight class="size-3" weight="bold" />
		</a>
	</div>
{/if}
