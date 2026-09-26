<script lang="ts">
	import { fmtIDR } from '$lib/utils/currency';
	import DrawerTransactionTable from './DrawerTransactionTable.svelte';
	import type { BudgetSnapshot } from '$lib/types/account-detail';

	let { budget }: { budget: BudgetSnapshot } = $props();

	const p = $derived(budget.percentUsed || 0);
</script>

<div class="space-y-4">
	<!-- Summary Stats Cards -->
	<div class="grid grid-cols-2 gap-2.5">
		<div class="rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] p-3">
			<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase"
				>Pagu Batas Belanja</span
			>
			<span class="font-mono text-base font-semibold text-[#111111]">
				{fmtIDR(budget.amount)}
			</span>
		</div>
		<div class="rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] p-3">
			<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase"
				>Sisa Pagu Belanja</span
			>
			<span class="font-mono text-base font-semibold text-[#346538]">
				{fmtIDR(budget.remaining)}
			</span>
		</div>
	</div>

	<!-- Status Card -->
	<div class="rounded-lg border border-[#EAEAEA] bg-white p-3.5">
		<div class="mb-2 flex items-center justify-between text-xs">
			<span class="text-[#787774]">Terpakai {p}% ({fmtIDR(budget.spent)})</span>
			<span class="font-mono text-xs font-semibold uppercase">{budget.status}</span>
		</div>
		<div class="h-2 w-full overflow-hidden rounded-full bg-[#F0EFEC]">
			<div class="h-full bg-[#111111]" style="width: {Math.min(100, p)}%"></div>
		</div>
	</div>

	<!-- Transactions List Table -->
	<div>
		<div class="mb-1 text-[10px] font-medium tracking-wider text-[#787774] uppercase">
			Transaksi Di Bawah Budget Ini
		</div>
		<DrawerTransactionTable currency="IDR" />
	</div>
</div>
