<script lang="ts">
	import { fmtIDR } from '$lib/utils/currency';
	import type { CategoryMetricItem } from '$lib/utils/category-metrics';

	interface Props {
		totalExpenseIDR: number;
		totalIncomeIDR: number;
		dominantExpenseCategory: CategoryMetricItem | null;
		expenseCount: number;
		incomeCount: number;
		periodLabel?: string;
	}

	let {
		totalExpenseIDR,
		totalIncomeIDR,
		dominantExpenseCategory,
		expenseCount,
		incomeCount,
		periodLabel = 'Bulan Ini'
	}: Props = $props();
</script>

<!-- Macro Summary Tiles -->
<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
	<!-- Tile 1: Total Pengeluaran -->
	<div class="rounded-lg border border-[#EAEAEA] bg-white p-3.5 shadow-2xs">
		<div class="flex items-center justify-between">
			<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase">
				Total Pengeluaran Terkategori
			</span>
			<span
				class="rounded bg-[#F0EFEC] px-1.5 py-0.5 font-mono text-[9px] text-[#787774] uppercase"
			>
				{periodLabel}
			</span>
		</div>
		<span class="mt-0.5 block font-mono text-xl font-semibold text-[#111111] tabular-nums">
			{fmtIDR(totalExpenseIDR)}
		</span>
		<span class="mt-1 block text-[11px] text-[#787774]">
			{expenseCount} kategori pengeluaran aktif
		</span>
	</div>

	<!-- Tile 2: Total Pemasukan -->
	<div class="rounded-lg border border-[#EAEAEA] bg-white p-3.5 shadow-2xs">
		<div class="flex items-center justify-between">
			<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase">
				Total Pemasukan Terkategori
			</span>
			<span class="size-1.5 rounded-full bg-[#346538]"></span>
		</div>
		<span class="mt-0.5 block font-mono text-xl font-semibold text-[#346538] tabular-nums">
			+{fmtIDR(totalIncomeIDR)}
		</span>
		<span class="mt-1 block text-[11px] text-[#787774]">
			{incomeCount} kategori pemasukan aktif
		</span>
	</div>

	<!-- Tile 3: Kategori Terbesar -->
	<div class="rounded-lg border border-[#EAEAEA] bg-white p-3.5 shadow-2xs">
		<div class="flex items-center justify-between">
			<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase">
				Kategori Paling Dominan
			</span>
			{#if dominantExpenseCategory}
				<span
					class="rounded bg-[#FDEBEC] px-1.5 py-0.5 font-mono text-[9px] font-semibold text-[#9F2F2D]"
				>
					{dominantExpenseCategory.percentageOfTotal.toFixed(1)}% Porsi
				</span>
			{/if}
		</div>
		{#if dominantExpenseCategory}
			<span class="mt-0.5 block truncate font-mono text-xl font-semibold text-[#111111] tabular-nums" title={dominantExpenseCategory.category.categoryName}>
				{dominantExpenseCategory.category.categoryName}
			</span>
			<span class="mt-1 block font-mono text-[11px] text-[#787774] tabular-nums">
				{fmtIDR(dominantExpenseCategory.totalAmountIDR)} · {dominantExpenseCategory.transactionCount} mutasi
			</span>
		{:else}
			<span class="mt-0.5 block font-mono text-xl font-semibold text-[#787774]">
				-
			</span>
			<span class="mt-1 block text-[11px] text-[#787774]">
				Belum ada pengeluaran di periode ini
			</span>
		{/if}
	</div>
</div>
