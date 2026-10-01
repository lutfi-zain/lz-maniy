<script lang="ts">
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { fmtIDR } from '$lib/utils/currency';
	import CalendarCheck from 'phosphor-svelte/lib/CalendarCheck';
	import ArrowDownRight from 'phosphor-svelte/lib/ArrowDownRight';
	import ArrowUpRight from 'phosphor-svelte/lib/ArrowUpRight';
	import ArrowsLeftRight from 'phosphor-svelte/lib/ArrowsLeftRight';
	import ArrowRight from 'phosphor-svelte/lib/ArrowRight';

	const projections = $derived(reedrichStore.summary?.cashflowProjections);
	const events = $derived(projections?.events ?? []);
	const netChange = $derived(projections?.projectedNetChange ?? 0);
	const isPositive = $derived(netChange >= 0);

	function formatShortDate(dateStr: string) {
		try {
			const d = new Date(dateStr);
			if (isNaN(d.getTime())) return dateStr;
			return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
		} catch {
			return dateStr;
		}
	}
</script>

<div class="rounded-lg border border-[#EAEAEA] bg-white p-3.5 shadow-2xs">
	<!-- Card Header -->
	<div class="flex items-center justify-between border-b border-[#F0F0EE] pb-2.5">
		<div class="flex items-center gap-2">
			<CalendarCheck class="size-4 text-[#111111]" weight="bold" />
			<h3 class="text-xs font-semibold tracking-tight text-[#111111]">
				Komitmen 30 Hari Kedepan
			</h3>
		</div>
		<span
			class="inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums {isPositive
				? 'bg-[#EDF3EC] text-[#346538]'
				: 'bg-[#FDEBEC] text-[#9F2F2D]'}"
		>
			{isPositive ? '+' : ''}{fmtIDR(netChange)}
		</span>
	</div>

	<!-- Projected Metrics Bar -->
	{#if projections}
		<div class="grid grid-cols-2 gap-2 border-b border-[#F0F0EE] py-2 text-[11px]">
			<div>
				<span class="text-[10px] text-[#787774]">Masuk Terjadwal</span>
				<div class="font-mono font-medium text-[#346538] tabular-nums">
					+{fmtIDR(projections.projectedIncome)}
				</div>
			</div>
			<div class="text-right">
				<span class="text-[10px] text-[#787774]">Keluar Terjadwal</span>
				<div class="font-mono font-medium text-[#9F2F2D] tabular-nums">
					-{fmtIDR(projections.projectedExpense)}
				</div>
			</div>
		</div>
	{/if}

	<!-- Events Timeline List -->
	{#if events.length > 0}
		<div class="divide-y divide-[#F7F6F3]">
			{#each events.slice(0, 6) as item (item.templateId + item.date)}
				<div class="flex items-center justify-between py-2 text-xs transition-colors hover:bg-[#FAF9F6]">
					<div class="flex items-center gap-2.5 min-w-0 pr-2">
						<span
							class="w-12 shrink-0 rounded bg-[#F7F6F3] py-0.5 text-center font-mono text-[10px] font-medium text-[#787774]"
						>
							{formatShortDate(item.date)}
						</span>
						<div class="min-w-0">
							<div class="truncate text-[11px] font-medium text-[#111111]">
								{item.templateName}
							</div>
							<div class="text-[10px] text-[#787774] capitalize">
								{item.type}
							</div>
						</div>
					</div>

					<div class="shrink-0 text-right">
						<span
							class="font-mono text-xs font-medium tabular-nums {item.type === 'income'
								? 'text-[#346538]'
								: 'text-[#111111]'}"
						>
							{item.type === 'income' ? '+' : '-'}{fmtIDR(item.amount)}
						</span>
					</div>
				</div>
			{/each}
		</div>

		{#if events.length > 6}
			<div class="mt-2 pt-2 border-t border-[#F0F0EE] text-center">
				<a
					href="/planning"
					class="inline-flex items-center gap-1 text-[11px] font-medium text-[#787774] hover:text-[#111111]"
				>
					<span>+{events.length - 6} komitmen lainnya di Perencanaan</span>
					<ArrowRight class="size-3" weight="bold" />
				</a>
			</div>
		{/if}
	{:else}
		<div class="py-6 text-center text-xs text-[#787774]">
			Tidak ada tagihan atau komitmen terjadwal dalam 30 hari ke depan.
		</div>
	{/if}
</div>
