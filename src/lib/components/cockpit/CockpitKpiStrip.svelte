<script lang="ts">
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { fmtIDR } from '$lib/utils/currency';
	import Vault from 'phosphor-svelte/lib/Vault';
	import Wallet from 'phosphor-svelte/lib/Wallet';
	import LockKey from 'phosphor-svelte/lib/LockKey';
	import Scales from 'phosphor-svelte/lib/Scales';

	const nw = $derived(reedrichStore.snapshot?.netWorth);
	const wl = $derived(reedrichStore.snapshot?.wallets);
	const cf = $derived(reedrichStore.snapshot?.monthlyCashFlow);
	const netSav = $derived(cf?.netSavings ?? 0);
</script>

<section id="kpis" class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
	<!-- Net Worth Tile -->
	<div class="rounded-lg border border-[#EAEAEA] bg-white p-3.5 shadow-2xs">
		<div
			class="flex items-center justify-between text-[11px] font-medium tracking-wider text-[#787774] uppercase"
		>
			<span class="flex items-center gap-1.5">
				<Vault class="size-3.5 text-[#111111]" weight="bold" />
				Kekayaan Bersih
			</span>
			<span class="font-mono text-[10px] text-[#787774]">Live FX</span>
		</div>
		<div class="mt-1 font-mono text-xl font-semibold tracking-tight text-[#111111] tabular-nums">
			{fmtIDR(nw?.consolidated.total)}
		</div>
		<div class="mt-1 truncate text-[11px] text-[#787774]">
			IDR {fmtIDR(nw?.byCurrency?.IDR)} · USDT {nw?.byCurrency?.USDT ?? 0}
		</div>
	</div>

	<!-- Spendable Cash Tile -->
	<a
		href="/accounts"
		class="block rounded-lg border border-[#EAEAEA] bg-white p-3.5 no-underline shadow-2xs transition-colors hover:border-[#C8C6BF]"
	>
		<div
			class="flex items-center justify-between text-[11px] font-medium tracking-wider text-[#787774] uppercase"
		>
			<span class="flex items-center gap-1.5">
				<Wallet class="size-3.5 text-[#346538]" weight="bold" />
				Kas Siap Pakai
			</span>
			<span class="size-1.5 rounded-full bg-[#346538]"></span>
		</div>
		<div class="mt-1 font-mono text-xl font-semibold tracking-tight text-[#346538] tabular-nums">
			{fmtIDR(wl?.spendable.total)}
		</div>
		<div class="mt-1 text-[11px] text-[#787774]">
			{wl?.spendable.items.length ?? 0} dompet operasional harian
		</div>
	</a>

	<!-- Locked Reserves Tile -->
	<a
		href="/accounts"
		class="block rounded-lg border border-[#EAEAEA] bg-white p-3.5 no-underline shadow-2xs transition-colors hover:border-[#C8C6BF]"
	>
		<div
			class="flex items-center justify-between text-[11px] font-medium tracking-wider text-[#787774] uppercase"
		>
			<span class="flex items-center gap-1.5">
				<LockKey class="size-3.5 text-[#956400]" weight="bold" />
				Dana Cadangan
			</span>
			<span class="size-1.5 rounded-full bg-[#956400]"></span>
		</div>
		<div class="mt-1 font-mono text-xl font-semibold tracking-tight text-[#111111] tabular-nums">
			{fmtIDR(wl?.locked.total)}
		</div>
		<div class="mt-1 text-[11px] text-[#787774]">
			{wl?.locked.items.length ?? 0} dompet sewa & pos darurat
		</div>
	</a>

	<!-- Monthly Net Savings Tile -->
	<a
		href="/planning"
		class="block rounded-lg border border-[#EAEAEA] bg-white p-3.5 no-underline shadow-2xs transition-colors hover:border-[#C8C6BF]"
	>
		<div
			class="flex items-center justify-between text-[11px] font-medium tracking-wider text-[#787774] uppercase"
		>
			<span class="flex items-center gap-1.5">
				<Scales class="size-3.5 text-[#111111]" weight="bold" />
				Tabungan Bulan Ini
			</span>
			<span class="size-1.5 rounded-full {netSav >= 0 ? 'bg-[#346538]' : 'bg-[#9F2F2D]'}"></span>
		</div>
		<div
			class="mt-1 font-mono text-xl font-semibold tracking-tight tabular-nums {netSav >= 0
				? 'text-[#346538]'
				: 'text-[#9F2F2D]'}"
		>
			{netSav >= 0 ? '+' : '−'}{fmtIDR(Math.abs(netSav))}
		</div>
		<div class="mt-1 text-[11px] text-[#787774]">
			In {fmtIDR(cf?.totalIncome)} · Out {fmtIDR(cf?.totalExpense)}
		</div>
	</a>
</section>
