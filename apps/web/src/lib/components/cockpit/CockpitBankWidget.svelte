<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { fmtCurrency, getConvertedBalanceInIDR } from '$lib/utils/currency';
	import { t } from '$lib/i18n/index.svelte';
	import Bank from 'phosphor-svelte/lib/Bank';
	import ArrowRight from 'phosphor-svelte/lib/ArrowRight';
	import LockKey from 'phosphor-svelte/lib/LockKey';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	const nw = $derived(reedrichStore.snapshot?.netWorth);
	const allWallets = $derived(reedrichStore.allWallets);

	// Group wallets by institution with subtotals
	const groupedBanks = $derived.by(() => {
		const map = new SvelteMap<
			string,
			{ total: number; currency: string; items: typeof allWallets }
		>();
		for (const w of allWallets) {
			const inst = w.institution || 'Lainnya';
			if (!map.has(inst)) {
				map.set(inst, { total: 0, currency: w.currency, items: [] });
			}
			const group = map.get(inst)!;
			group.items.push(w);
			// For totals, use netWorth.byInstitution when available
			if (nw?.byInstitution && nw.byInstitution[inst] !== undefined) {
				group.total = nw.byInstitution[inst];
			} else {
				group.total += getConvertedBalanceInIDR(w.balance, w.currency);
			}
		}
		return Array.from(map.entries());
	});

	function handleWalletClick(w: (typeof allWallets)[0]) {
		reedrichStore.openDrawer({
			type: 'wallet',
			title: w.walletName,
			subtitle: `${w.institution} · Tipe: ${w.type} · Mata Uang: ${w.currency}`,
			badge: w.isLocked === 1 ? 'DOMPET TERKUNCI' : 'DOMPET SPENDABLE',
			data: { wallet: w }
		});
		reedrichStore.fetchTransactionsForDrawer({ walletId: w.walletId, limit: 50 });
	}
</script>

<!-- Desktop: Detailed Institution & Sub-Wallets Sidebar (>= md) -->
<div class="hidden rounded-lg border border-[#EAEAEA] bg-white p-4 shadow-2xs md:block">
	<div class="mb-3 flex items-center justify-between border-b border-[#EAEAEA] pb-2.5">
		<div class="flex items-center gap-1.5">
			<Bank class="size-4 text-[#111111]" weight="bold" />
			<h3 class="text-xs font-semibold text-[#111111]">Balance by Institution</h3>
		</div>
		<span class="font-mono text-[10px] text-[#787774] uppercase">
			{groupedBanks.length} Institutions
		</span>
	</div>

	<!-- Institution list -->
	{#if reedrichStore.isLoading}
		<div class="space-y-3">
			{#each [0, 1, 2] as i (i)}
				<div class="space-y-2 rounded border border-[#EAEAEA] bg-[#F9F9F8] p-2.5">
					<div class="flex items-center justify-between">
						<Skeleton class="h-3.5 w-24" />
						<Skeleton class="h-3.5 w-20" />
					</div>
					<Skeleton class="h-2.5 w-32" />
				</div>
			{/each}
		</div>
	{:else}
		<div class="space-y-3">
			{#each groupedBanks as [inst, data] (inst)}
				<div class="rounded border border-[#EAEAEA] bg-[#F9F9F8] p-2.5">
					<div
						class="mb-1.5 flex items-center justify-between text-xs font-semibold text-[#111111]"
					>
						<div class="flex items-center gap-1.5">
							<span>{inst}</span>
							<span class="font-mono text-[10px] font-normal text-[#787774]">
								({data.items.length} accounts)
							</span>
						</div>
						<span class="font-mono text-xs text-[#111111] tabular-nums">
							{fmtCurrency(data.total, inst === 'Bitget' ? 'USDT' : 'IDR')}
						</span>
					</div>

					<!-- Sub-wallets -->
					<div class="space-y-1 border-l border-[#EAEAEA] pl-2">
						{#each data.items as w (w.walletId)}
							<button
								type="button"
								onclick={() => handleWalletClick(w)}
								class="group flex w-full cursor-pointer items-center justify-between py-0.5 text-[11px] text-[#787774] transition-colors hover:text-[#111111]"
							>
								<span class="flex max-w-[130px] items-center gap-1 truncate text-left">
									{#if w.isLocked === 1}
										<LockKey class="size-2.5 shrink-0 text-[#956400]" weight="bold" />
									{/if}
									<span class="truncate">{w.walletName}</span>
								</span>
								<span class="font-mono text-[#111111] tabular-nums group-hover:underline">
									{fmtCurrency(w.balance, w.currency)}
								</span>
							</button>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
	<a
		href="/accounts"
		class="mt-3 flex items-center justify-center gap-1.5 rounded border border-[#EAEAEA] bg-white py-1.5 text-center text-[11px] font-medium text-[#111111] no-underline transition-colors hover:bg-[#F9F9F8]"
	>
		<span>{t('accounts.title')}</span>
		<ArrowRight class="size-3" weight="bold" />
	</a>
</div>

<!-- Mobile Quick Cash Bar (< md) -->
<div class="rounded-lg border border-[#EAEAEA] bg-white p-3 shadow-2xs md:hidden">
	<div class="mb-2 flex items-center justify-between">
		<div class="flex items-center gap-1.5">
			<Bank class="size-3.5 text-[#111111]" weight="bold" />
			<h3 class="text-xs font-semibold text-[#111111]">Account Liquidity</h3>
		</div>
		<a
			href="/accounts"
			class="flex items-center gap-1 text-[11px] font-medium text-[#787774] no-underline transition-colors hover:text-[#111111]"
		>
			<span>{t('accounts.allWallets')}</span>
			<ArrowRight class="size-3" weight="bold" />
		</a>
	</div>

	<!-- Horizontal rail of institutions -->
	{#if reedrichStore.isLoading}
		<div class="flex items-center gap-2 overflow-x-auto pb-0.5">
			{#each [0, 1, 2, 3] as i (i)}
				<Skeleton class="h-8 w-24 shrink-0 rounded" />
			{/each}
		</div>
	{:else}
		<div class="flex items-center gap-2 overflow-x-auto pb-0.5 text-xs">
			{#each groupedBanks as [inst, data] (inst)}
				<a
					href="/accounts"
					class="flex shrink-0 items-center gap-2 rounded border border-[#EAEAEA] bg-[#F9F9F8] px-2.5 py-1.5 no-underline transition-colors hover:border-[#111111]"
				>
					<span class="font-medium text-[#111111]">{inst}</span>
					<span class="font-mono font-semibold text-[#111111] tabular-nums">
						{fmtCurrency(data.total, inst === 'Bitget' ? 'USDT' : 'IDR')}
					</span>
				</a>
			{/each}
		</div>
	{/if}
</div>
