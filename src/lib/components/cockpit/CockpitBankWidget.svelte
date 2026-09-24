<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { fmtCurrency, getConvertedBalanceInIDR } from '$lib/utils/currency';
	import Bank from 'phosphor-svelte/lib/Bank';
	import ArrowRight from 'phosphor-svelte/lib/ArrowRight';
	import LockKey from 'phosphor-svelte/lib/LockKey';

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
</script>

<div class="rounded-lg border border-[#EAEAEA] bg-white p-4 shadow-2xs">
	<div class="mb-3 flex items-center justify-between border-b border-[#EAEAEA] pb-2.5">
		<div class="flex items-center gap-1.5">
			<Bank class="size-4 text-[#111111]" weight="bold" />
			<h3 class="text-xs font-semibold text-[#111111]">Saldo per Institusi</h3>
		</div>
		<span class="font-mono text-[10px] text-[#787774] uppercase">
			{groupedBanks.length} Institusi
		</span>
	</div>

	<!-- Institution list -->
	<div class="space-y-3">
		{#each groupedBanks as [inst, data] (inst)}
			<div class="rounded border border-[#EAEAEA] bg-[#F9F9F8] p-2.5">
				<div class="mb-1.5 flex items-center justify-between text-xs font-semibold text-[#111111]">
					<div class="flex items-center gap-1.5">
						<span>{inst}</span>
						<span class="font-mono text-[10px] font-normal text-[#787774]">
							({data.items.length} akun)
						</span>
					</div>
					<span class="font-mono text-xs text-[#111111] tabular-nums">
						{fmtCurrency(data.total, inst === 'Bitget' ? 'USDT' : 'IDR')}
					</span>
				</div>

				<!-- Sub-wallets -->
				<div class="space-y-1 border-l border-[#EAEAEA] pl-2">
					{#each data.items as w (w.walletId)}
						<a
							href="/ledger?walletId={encodeURIComponent(w.walletId)}"
							class="group flex items-center justify-between py-0.5 text-[11px] text-[#787774] no-underline transition-colors hover:text-[#111111]"
						>
							<span class="flex max-w-[130px] items-center gap-1 truncate">
								{#if w.isLocked === 1}
									<LockKey class="size-2.5 shrink-0 text-[#956400]" weight="bold" />
								{/if}
								<span class="truncate">{w.walletName}</span>
							</span>
							<span class="font-mono text-[#111111] tabular-nums group-hover:underline">
								{fmtCurrency(w.balance, w.currency)}
							</span>
						</a>
					{/each}
				</div>
			</div>
		{/each}
	</div>

	<a
		href="/accounts"
		class="mt-3 flex items-center justify-center gap-1.5 rounded border border-[#EAEAEA] bg-white py-1.5 text-center text-[11px] font-medium text-[#111111] no-underline transition-colors hover:bg-[#F9F9F8]"
	>
		<span>Kelola Akun & Bank</span>
		<ArrowRight class="size-3" weight="bold" />
	</a>
</div>
