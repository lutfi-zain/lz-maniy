<script lang="ts">
	import { fmtIDR } from '$lib/utils/currency';
	import DrawerTransactionTable from './DrawerTransactionTable.svelte';
	import type { CategoryBreakdownItem } from '$lib/types/account-detail';

	let { item }: { item: CategoryBreakdownItem } = $props();
</script>

<div class="space-y-4">
	<!-- Summary Stats Cards -->
	<div class="grid grid-cols-2 gap-2.5">
		<div class="rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] p-3">
			<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase"
				>Total Terpakai Bulan Ini</span
			>
			<span class="font-mono text-base font-semibold text-[#111111]">
				{fmtIDR(item.amount)}
			</span>
		</div>
		<div class="rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] p-3">
			<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase"
				>Porsi Pengeluaran</span
			>
			<span class="font-mono text-base font-semibold text-[#111111]">
				{item.percentage}%
			</span>
		</div>
	</div>

	<!-- Progress Track -->
	<div class="h-2 w-full overflow-hidden rounded-full bg-[#F0EFEC]">
		<div class="h-full bg-[#111111]" style="width: {Math.min(100, item.percentage * 2.8)}%"></div>
	</div>

	<!-- Transactions List Table -->
	<div>
		<div class="mb-1 text-[10px] font-medium tracking-wider text-[#787774] uppercase">
			Daftar Transaksi Kategori "{item.categoryName}"
		</div>
		<DrawerTransactionTable currency="IDR" />
	</div>
</div>
