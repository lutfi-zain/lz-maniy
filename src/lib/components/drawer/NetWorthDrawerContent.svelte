<script lang="ts">
	import { fmtIDR, fmtCurrency } from '$lib/utils/currency';
	import Bank from 'phosphor-svelte/lib/Bank';
	import type { NetWorthSnapshot } from '$lib/types/account-detail';

	let { netWorth }: { netWorth: NetWorthSnapshot } = $props();

	const byInst = $derived(Object.entries(netWorth.byInstitution ?? {}));
	const byCur = $derived(Object.entries(netWorth.byCurrency ?? {}));
</script>

<div class="space-y-4">
	<!-- Summary Stats Cards -->
	<div class="grid grid-cols-2 gap-2.5">
		<div class="rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] p-3">
			<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase"
				>Total Konsolidasi</span
			>
			<span class="font-mono text-base font-semibold text-[#111111]">
				{fmtIDR(netWorth.consolidated.total)}
			</span>
		</div>
		<div class="rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] p-3">
			<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase"
				>Sumber Valuasi Kurs</span
			>
			<span class="font-mono text-xs font-semibold text-[#111111]">
				{netWorth.consolidated.fxSource || 'live edge'}
			</span>
		</div>
	</div>

	<!-- Currency Sub-aggregations -->
	<div>
		<div class="mb-2 text-[10px] font-medium tracking-wider text-[#787774] uppercase">
			Berdasarkan Mata Uang
		</div>
		<div class="grid grid-cols-2 gap-2">
			{#each byCur as [c, v] (c)}
				<div class="rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] p-2.5">
					<span class="text-[10px] text-[#787774] uppercase">{c}</span>
					<div class="font-mono text-xs font-semibold text-[#111111]">
						{fmtCurrency(v, c)}
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Institution Breakdown -->
	<div>
		<div class="mb-2 text-[10px] font-medium tracking-wider text-[#787774] uppercase">
			Berdasarkan Institusi Keuangan
		</div>
		<div class="space-y-1.5">
			{#each byInst as [inst, val] (inst)}
				<div
					class="flex items-center justify-between rounded-lg border border-[#EAEAEA] bg-white p-2.5 text-xs"
				>
					<div class="flex items-center gap-2">
						<Bank class="size-3.5 text-[#787774]" weight="bold" />
						<span class="font-medium text-[#111111]">{inst}</span>
					</div>
					<div class="font-mono font-semibold text-[#111111]">
						{fmtCurrency(val, inst === 'Bitget' ? 'USDT' : 'IDR')}
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
