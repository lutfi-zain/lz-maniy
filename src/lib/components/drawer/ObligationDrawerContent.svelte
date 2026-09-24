<script lang="ts">
	import { fmtIDR } from '$lib/utils/currency';
	import { dFmt } from '$lib/utils/dates';
	import type { ActiveDebt, ActiveLoan } from '$lib/types/account-detail';

	let {
		item,
		type
	}: {
		item: ActiveDebt | ActiveLoan;
		type: 'debt' | 'loan';
	} = $props();

	const isDebt = $derived(type === 'debt');
</script>

<div class="space-y-4">
	<!-- Summary Stats Cards -->
	<div class="grid grid-cols-2 gap-2.5">
		<div class="rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] p-3">
			<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase"
				>Sisa Nominal</span
			>
			<span
				class="font-mono text-base font-semibold {isDebt ? 'text-[#9F2F2D]' : 'text-[#346538]'}"
			>
				{isDebt ? '−' : '+'}{fmtIDR(item.remainingAmount)}
			</span>
		</div>
		<div class="rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] p-3">
			<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase"
				>Tenggat Waktu</span
			>
			<span class="font-mono text-sm font-semibold text-[#111111]">
				{dFmt(item.dueDate)}
			</span>
		</div>
	</div>

	<!-- Information Card -->
	<div class="space-y-2.5 rounded-lg border border-[#EAEAEA] bg-white p-4 text-xs">
		<div class="flex items-center justify-between">
			<span class="text-[#787774]">Pihak Terkait</span>
			<span class="font-semibold text-[#111111]">{item.personName}</span>
		</div>
		<div class="flex items-center justify-between">
			<span class="text-[#787774]">Status Penyelesaian</span>
			<span
				class="rounded-full bg-[#EFEFED] px-2 py-0.5 font-mono text-[10px] font-medium uppercase"
			>
				{item.status}
			</span>
		</div>
		<div class="flex items-center justify-between">
			<span class="text-[#787774]">Klasifikasi</span>
			<span class="font-medium text-[#111111]">
				{isDebt ? 'Kewajiban Utang (Wajib Bayar)' : 'Piutang / Talangan (Berhak Diterima)'}
			</span>
		</div>
	</div>
</div>
