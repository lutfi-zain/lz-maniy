<script lang="ts">
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { fmtIDR } from '$lib/utils/currency';
	import { dFmt } from '$lib/utils/dates';
	import CategoryBar from './CategoryBar.svelte';
	import ChartBar from 'phosphor-svelte/lib/ChartBar';
	import Plus from 'phosphor-svelte/lib/Plus';
	import { categoryFormStore } from '$lib/stores/category-form.svelte';
	const cf = $derived(reedrichStore.snapshot?.monthlyCashFlow);
	const categories = $derived(cf?.categoryBreakdown ?? []);
	const netSav = $derived(cf?.netSavings ?? 0);
</script>

<section id="sec-cashflow" class="mb-5 rounded-xl border border-[#EAEAEA] bg-white p-5 md:p-6">
	<div
		class="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-[#EAEAEA] pb-3"
	>
		<div>
			<h2 class="serif flex items-center gap-2 text-xl font-medium text-[#111111] md:text-2xl">
				<ChartBar class="size-5 text-[#111111]" weight="bold" />
				<span>Breakdown Pengeluaran</span>
			</h2>
			<div class="mt-0.5 text-xs text-[#787774]">
				{#if cf?.period}
					{dFmt(cf.period.start)} → {dFmt(cf.period.end)} · Klik baris kategori untuk daftar transaksi
				{:else}
					Bulan Berjalan · Klik baris kategori untuk daftar transaksi
				{/if}
			</div>
		</div>

		<div class="flex items-center gap-2">
			<button
				type="button"
				onclick={() => categoryFormStore.openCreate()}
				class="flex cursor-pointer items-center gap-1 rounded bg-[#111111] px-2 py-1 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
			>
				<Plus class="size-3" weight="bold" />
				<span>+ Kategori</span>
			</button>

			<span
				class="rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold {netSav >= 0
					? 'bg-[#EDF3EC] text-[#346538]'
					: 'bg-[#FDEBEC] text-[#9F2F2D]'}"
			>
				{netSav >= 0 ? '+' : '−'}{fmtIDR(Math.abs(netSav))}
			</span>
		</div>
	</div>
	<!-- Monthly Totals Card -->
	<div
		class="mb-4 flex items-center justify-between rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] p-3 text-xs"
	>
		<div>
			<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase"
				>Pemasukan</span
			>
			<span class="font-mono text-sm font-semibold text-[#346538]">+{fmtIDR(cf?.totalIncome)}</span>
		</div>
		<div class="text-right">
			<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase"
				>Pengeluaran</span
			>
			<span class="font-mono text-sm font-semibold text-[#111111]">−{fmtIDR(cf?.totalExpense)}</span
			>
		</div>
	</div>

	<!-- Category List -->
	<div>
		{#each categories as item (item.categoryName)}
			<CategoryBar {item} />
		{:else}
			<div class="py-6 text-center font-mono text-xs text-[#787774]">
				Tidak ada data pengeluaran.
			</div>
		{/each}
	</div>
</section>
