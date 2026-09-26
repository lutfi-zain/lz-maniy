<script lang="ts">
	import { fmtCurrency, fmtIDR } from '$lib/utils/currency';
	import { dFmtTime } from '$lib/utils/dates';
	import DrawerTransactionTable from './DrawerTransactionTable.svelte';
	import type { WalletItem } from '$lib/types/account-detail';

	let { wallet }: { wallet: WalletItem } = $props();

	const isLocked = $derived(wallet.isLocked === 1);
	const lt = $derived(wallet.lastTransaction);
</script>

<div class="space-y-4">
	<!-- Summary Stats Cards -->
	<div class="grid grid-cols-2 gap-2.5">
		<div class="rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] p-3">
			<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase"
				>Saldo Saat Ini</span
			>
			<span class="font-mono text-base font-semibold text-[#111111]">
				{fmtCurrency(wallet.balance, wallet.currency)}
			</span>
		</div>
		<div class="rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] p-3">
			<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase"
				>Status Akses</span
			>
			<span class="text-xs font-semibold {isLocked ? 'text-[#956400]' : 'text-[#346538]'}">
				{isLocked ? 'Dana Cadangan / Terkunci' : 'Siap Dibelanjakan'}
			</span>
		</div>
	</div>

	<!-- Last Transaction preview -->
	{#if lt}
		<div class="rounded-lg border border-black/5 bg-[#F9F9F8] p-3 text-xs">
			<span class="mb-1 block text-[10px] font-medium tracking-wider text-[#787774] uppercase">
				Transaksi Terakhir Tercatat
			</span>
			<div class="flex items-center justify-between gap-2">
				<div>
					<div class="font-medium text-[#111111]">{lt.description || lt.category}</div>
					<div class="text-[11px] text-[#787774]">{dFmtTime(lt.date)} · {lt.category}</div>
				</div>
				<div
					class="font-mono font-semibold {lt.direction === 'in'
						? 'text-[#346538]'
						: 'text-[#111111]'}"
				>
					{lt.direction === 'in' ? '+' : '−'}{fmtIDR(lt.amount)}
				</div>
			</div>
		</div>
	{/if}

	<!-- Transactions List Table -->
	<div>
		<div class="mb-1 text-[10px] font-medium tracking-wider text-[#787774] uppercase">
			Riwayat Transaksi Dompet
		</div>
		<DrawerTransactionTable currency={wallet.currency} />
	</div>
</div>
