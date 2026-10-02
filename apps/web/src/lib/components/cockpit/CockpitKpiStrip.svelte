<script lang="ts">
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { fmtIDR } from '$lib/utils/currency';
	import { t } from '$lib/i18n/index.svelte';
	import Vault from 'phosphor-svelte/lib/Vault';
	import Wallet from 'phosphor-svelte/lib/Wallet';
	import LockKey from 'phosphor-svelte/lib/LockKey';
	import Scales from 'phosphor-svelte/lib/Scales';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	const nw = $derived(reedrichStore.snapshot?.netWorth);
	const wl = $derived(reedrichStore.snapshot?.wallets);
	const cf = $derived(reedrichStore.snapshot?.monthlyCashFlow);
	const netSav = $derived(cf?.netSavings ?? 0);
</script>

{#if reedrichStore.isLoading}
	<section id="kpis-loading" class="mb-4 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
		{#each [0, 1, 2, 3] as i (i)}
			<div class="space-y-2.5 rounded-lg border border-[#EAEAEA] bg-white p-3 shadow-2xs sm:p-3.5">
				<div class="flex items-center justify-between">
					<Skeleton class="h-3 w-20" />
					<Skeleton class="size-3.5 rounded-full" />
				</div>
				<Skeleton class="h-6 w-32" />
				<Skeleton class="h-2.5 w-24" />
			</div>
		{/each}
	</section>
{:else}
	<section id="kpis" class="mb-4 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
		<!-- Net Worth Tile -->
		<div data-testid="kpi-net-worth" class="rounded-lg border border-[#EAEAEA] bg-white p-3 shadow-2xs sm:p-3.5">
			<div
				class="flex items-center justify-between text-[11px] font-medium tracking-wider text-[#787774] uppercase"
			>
				<span class="flex items-center gap-1.5">
					<Vault class="size-3.5 text-[#111111]" weight="bold" />
					{t('cockpit.netWorth')}
				</span>
				<span class="font-mono text-[10px] text-[#787774]">{t('cockpit.liveFx')}</span>
			</div>
			<div
				class="mt-1 font-mono text-base font-semibold tracking-tight text-[#111111] tabular-nums sm:text-xl"
			>
				{fmtIDR(nw?.consolidated.total)}
			</div>
			<div class="mt-1 truncate text-[10px] text-[#787774] sm:text-[11px]">
				IDR {fmtIDR(nw?.byCurrency?.IDR)} · USDT {nw?.byCurrency?.USDT ?? 0}
			</div>
		</div>

		<!-- Spendable Cash Tile -->
		<a
			data-testid="kpi-spendable"
			href="/accounts"
			class="block rounded-lg border border-[#EAEAEA] bg-white p-3 no-underline shadow-2xs transition-colors hover:border-[#C8C6BF] sm:p-3.5"
		>
			<div
				class="flex items-center justify-between text-[11px] font-medium tracking-wider text-[#787774] uppercase"
			>
				<span class="flex items-center gap-1.5">
					<Wallet class="size-3.5 text-[#346538]" weight="bold" />
					{t('cockpit.safeToSpend')}
				</span>
				<span class="size-1.5 rounded-full bg-[#346538]"></span>
			</div>
			<div
				class="mt-1 font-mono text-base font-semibold tracking-tight text-[#346538] tabular-nums sm:text-xl"
			>
				{fmtIDR(wl?.spendable.total)}
			</div>
			<div class="mt-1 truncate text-[10px] text-[#787774] sm:text-[11px]">
				{wl?.spendable.items.length ?? 0}
				{t('accounts.walletCount', { count: wl?.spendable.items.length ?? 0 })}
			</div>
		</a>

		<!-- Locked Reserves Tile -->
		<a
			data-testid="kpi-locked"
			href="/accounts"
			class="block rounded-lg border border-[#EAEAEA] bg-white p-3 no-underline shadow-2xs transition-colors hover:border-[#C8C6BF] sm:p-3.5"
		>
			<div
				class="flex items-center justify-between text-[11px] font-medium tracking-wider text-[#787774] uppercase"
			>
				<span class="flex items-center gap-1.5">
					<LockKey class="size-3.5 text-[#956400]" weight="bold" />
					{t('cockpit.committedFunds')}
				</span>
				<span class="size-1.5 rounded-full bg-[#956400]"></span>
			</div>
			<div
				class="mt-1 font-mono text-base font-semibold tracking-tight text-[#111111] tabular-nums sm:text-xl"
			>
				{fmtIDR(wl?.locked.total)}
			</div>
			<div class="mt-1 truncate text-[10px] text-[#787774] sm:text-[11px]">
				{wl?.locked.items.length ?? 0}
				{t('accounts.walletCount', { count: wl?.locked.items.length ?? 0 })}
			</div>
		</a>

		<!-- Monthly Net Savings Tile -->
		<a
			data-testid="kpi-net-savings"
			href="/planning"
			class="block rounded-lg border border-[#EAEAEA] bg-white p-3 no-underline shadow-2xs transition-colors hover:border-[#C8C6BF] sm:p-3.5"
		>
			<div
				class="flex items-center justify-between text-[11px] font-medium tracking-wider text-[#787774] uppercase"
			>
				<span class="flex items-center gap-1.5">
					<Scales class="size-3.5 text-[#111111]" weight="bold" />
					{t('cockpit.netCashflow')}
				</span>
				<span class="size-1.5 rounded-full {netSav >= 0 ? 'bg-[#346538]' : 'bg-[#9F2F2D]'}"></span>
			</div>
			<div
				class="mt-1 font-mono text-base font-semibold tracking-tight tabular-nums sm:text-xl {netSav >=
				0
					? 'text-[#346538]'
					: 'text-[#9F2F2D]'}"
			>
				{netSav >= 0 ? '+' : '−'}{fmtIDR(Math.abs(netSav))}
			</div>
			<div class="mt-1 truncate text-[10px] text-[#787774] sm:text-[11px]">
				In {fmtIDR(cf?.totalIncome)} · Out {fmtIDR(cf?.totalExpense)}
			</div>
		</a>
	</section>
{/if}
