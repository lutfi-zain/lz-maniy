<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { fmtIDR, fmtCurrency } from '$lib/utils/currency';
	import Bank from 'phosphor-svelte/lib/Bank';
	import ArrowRight from 'phosphor-svelte/lib/ArrowRight';
	import Wallet from 'phosphor-svelte/lib/Wallet';
	import CurrencyBtc from 'phosphor-svelte/lib/CurrencyBtc';
	import DeviceMobile from 'phosphor-svelte/lib/DeviceMobile';
	import Money from 'phosphor-svelte/lib/Money';

	const nw = $derived(reedrichStore.snapshot?.netWorth);
	const wl = $derived(reedrichStore.snapshot?.wallets);
	const allWallets = $derived(reedrichStore.allWallets);

	// Group wallets hierarchically with detailed subtotals
	const groupedInstitutions = $derived.by(() => {
		const map = new SvelteMap<
			string,
			{
				institution: string;
				total: number;
				currency: string;
				spendableTotal: number;
				lockedTotal: number;
				spendableCount: number;
				lockedCount: number;
				wallets: typeof allWallets;
			}
		>();

		for (const w of allWallets) {
			const inst = w.institution || 'Lainnya';
			if (!map.has(inst)) {
				map.set(inst, {
					institution: inst,
					total: 0,
					currency: w.currency,
					spendableTotal: 0,
					lockedTotal: 0,
					spendableCount: 0,
					lockedCount: 0,
					wallets: []
				});
			}
			const group = map.get(inst)!;
			group.wallets.push(w);

			if (w.isLocked === 1) {
				group.lockedTotal += w.balance;
				group.lockedCount++;
			} else {
				group.spendableTotal += w.balance;
				group.spendableCount++;
			}

			// For aggregate total, align with netWorth when available
			if (nw?.byInstitution && nw.byInstitution[inst] !== undefined) {
				group.total = nw.byInstitution[inst];
			} else {
				group.total += w.balance;
			}
		}

		return Array.from(map.values()).sort((a, b) => b.total - a.total);
	});
</script>

<div class="space-y-4">
	<!-- Studio Header -->
	<div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAEAEA] pb-3">
		<div>
			<h1 class="flex items-center gap-2 text-xl font-semibold text-[#111111]">
				<Bank class="size-5 text-[#111111]" weight="bold" />
				<span>Matriks Akun & Bank</span>
			</h1>
			<p class="mt-0.5 text-xs text-[#787774]">
				Hierarki rekening terdistribusi menurut institusi keuangan, subtotal saldo per bank, dan
				pemisahan dana operasional vs cadangan.
			</p>
		</div>
	</div>

	<!-- Macro Summary Tiles -->
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
		<div class="rounded-lg border border-[#EAEAEA] bg-white p-3.5 shadow-2xs">
			<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase">
				Total Seluruh Aset
			</span>
			<span class="mt-0.5 block font-mono text-xl font-semibold text-[#111111] tabular-nums">
				{fmtIDR(nw?.consolidated.total)}
			</span>
			<span class="mt-1 block text-[11px] text-[#787774]">
				{groupedInstitutions.length} institusi keuangan terdaftar
			</span>
		</div>

		<div class="rounded-lg border border-[#EAEAEA] bg-white p-3.5 shadow-2xs">
			<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase">
				Kas Siap Pakai (Spendable)
			</span>
			<span class="mt-0.5 block font-mono text-xl font-semibold text-[#346538] tabular-nums">
				{fmtIDR(wl?.spendable.total)}
			</span>
			<span class="mt-1 block text-[11px] text-[#787774]">
				{wl?.spendable.items.length ?? 0} akun tanpa gembok
			</span>
		</div>

		<div class="rounded-lg border border-[#EAEAEA] bg-white p-3.5 shadow-2xs">
			<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase">
				Dana Cadangan & Sewa (Locked)
			</span>
			<span class="mt-0.5 block font-mono text-xl font-semibold text-[#111111] tabular-nums">
				{fmtIDR(wl?.locked.total)}
			</span>
			<span class="mt-1 block text-[11px] text-[#787774]">
				{wl?.locked.items.length ?? 0} akun alokasi khusus
			</span>
		</div>
	</div>

	<!-- Bank Groups Hierarchy Tree -->
	<div class="space-y-4">
		{#each groupedInstitutions as group (group.institution)}
			<div class="overflow-hidden rounded-lg border border-[#EAEAEA] bg-white shadow-2xs">
				<!-- Bank Group Header with Subtotals -->
				<div
					class="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAEAEA] bg-[#F9F9F8] px-4 py-3"
				>
					<div class="flex items-center gap-2">
						<Bank class="size-4 text-[#111111]" weight="bold" />
						<h2 class="text-sm font-semibold text-[#111111]">{group.institution}</h2>
						<span class="rounded bg-[#EFEFED] px-2 py-0.5 font-mono text-[10px] text-[#787774]">
							{group.wallets.length} akun
						</span>
					</div>

					<div class="flex items-center gap-4 font-mono text-xs tabular-nums">
						<div class="hidden text-[11px] text-[#787774] sm:block">
							Spendable: <span class="font-medium text-[#346538]"
								>{fmtCurrency(group.spendableTotal, group.currency)}</span
							>
							· Locked:
							<span class="font-medium text-[#956400]"
								>{fmtCurrency(group.lockedTotal, group.currency)}</span
							>
						</div>
						<div class="border-l border-[#EAEAEA] pl-3 text-sm font-semibold text-[#111111]">
							Subtotal: {fmtCurrency(group.total, group.institution === 'Bitget' ? 'USDT' : 'IDR')}
						</div>
					</div>
				</div>

				<!-- Wallets List inside this bank -->
				<div class="divide-y divide-[#EAEAEA]">
					{#each group.wallets as w (w.walletId)}
						{@const isLocked = w.isLocked === 1}
						<div
							class="flex flex-wrap items-center justify-between gap-3 p-3.5 transition-colors hover:bg-[#FBFBFA]"
						>
							<div class="flex items-center gap-3">
								<div class="rounded border border-[#EAEAEA] bg-[#F9F9F8] p-2 text-[#787774]">
									{#if w.type === 'crypto'}
										<CurrencyBtc class="size-4" weight="bold" />
									{:else if w.type === 'e-wallet'}
										<DeviceMobile class="size-4" weight="bold" />
									{:else if w.type === 'cash'}
										<Money class="size-4" weight="bold" />
									{:else}
										<Wallet class="size-4" weight="bold" />
									{/if}
								</div>

								<div>
									<div class="flex items-center gap-1.5 text-xs font-semibold text-[#111111]">
										<span>{w.walletName}</span>
										<span class="size-1.5 rounded-full {isLocked ? 'bg-[#956400]' : 'bg-[#346538]'}"
										></span>
										<span class="font-mono text-[10px] font-normal text-[#787774] uppercase">
											{isLocked ? 'Locked' : 'Spendable'}
										</span>
									</div>
									<div class="mt-0.5 text-[11px] text-[#787774]">
										Tipe: <span class="capitalize">{w.type}</span> · Mata Uang: {w.currency}
										{#if w.lastTransaction}
											· Terakhir: {w.lastTransaction.direction === 'in' ? '+' : '−'}{fmtIDR(
												w.lastTransaction.amount
											)} ({w.lastTransaction.category})
										{/if}
									</div>
								</div>
							</div>

							<div class="flex items-center gap-4">
								<div class="text-right font-mono text-sm font-semibold text-[#111111] tabular-nums">
									{fmtCurrency(w.balance, w.currency)}
								</div>

								<a
									href="/ledger?walletId={encodeURIComponent(w.walletId)}"
									class="flex cursor-pointer items-center gap-1 rounded border border-[#EAEAEA] bg-white px-2.5 py-1 text-xs text-[#111111] no-underline transition-colors hover:border-[#C8C6BF] hover:bg-[#F9F9F8]"
								>
									<span>Lihat Mutasi</span>
									<ArrowRight class="size-3" weight="bold" />
								</a>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>
