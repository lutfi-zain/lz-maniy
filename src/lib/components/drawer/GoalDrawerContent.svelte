<script lang="ts">
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { fmtIDR, fmtCurrency } from '$lib/utils/currency';
	import ArrowRight from 'phosphor-svelte/lib/ArrowRight';
	import type { GoalSnapshot } from '$lib/types/account-detail';

	let { goal }: { goal: GoalSnapshot } = $props();

	const p = $derived(Math.round(goal.progressPercentage || 0));
	const linked = $derived(goal.linkedWalletsBreakdown ?? []);

	function openWallet(walletId: string) {
		const wallet = reedrichStore.allWallets.find((w) => w.walletId === walletId);
		if (!wallet) return;
		reedrichStore.openDrawer({
			type: 'wallet',
			title: wallet.walletName,
			subtitle: `${wallet.institution} · Tipe: ${wallet.type} · Mata Uang: ${wallet.currency}`,
			badge: wallet.isLocked === 1 ? 'DOMPET TERKUNCI' : 'DOMPET SPENDABLE',
			data: { wallet }
		});
		reedrichStore.fetchTransactionsForDrawer({ walletId: wallet.walletId, limit: 50 });
	}
</script>

<div class="space-y-4">
	<!-- Summary Stats Cards -->
	<div class="grid grid-cols-2 gap-2.5">
		<div class="rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] p-3">
			<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase"
				>Target Sasaran</span
			>
			<span class="font-mono text-base font-semibold text-[#111111]">
				{fmtIDR(goal.targetAmount)}
			</span>
		</div>
		<div class="rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] p-3">
			<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase"
				>Terkumpul Saat Ini</span
			>
			<span class="font-mono text-base font-semibold text-[#346538]">
				{fmtIDR(goal.currentAmount)}
			</span>
		</div>
	</div>

	<!-- Progress Track -->
	<div class="rounded-lg border border-[#EAEAEA] bg-white p-3.5">
		<div class="mb-2 flex items-center justify-between text-xs">
			<span class="text-[#787774]">Pencapaian Target</span>
			<span class="font-mono font-semibold">{p}%</span>
		</div>
		<div class="h-2 w-full overflow-hidden rounded-full bg-[#F0EFEC]">
			<div class="h-full bg-[#111111]" style="width: {Math.min(100, p)}%"></div>
		</div>
	</div>

	<!-- Linked Wallets Detail -->
	{#if linked.length > 0}
		<div>
			<div class="mb-2 text-[10px] font-medium tracking-wider text-[#787774] uppercase">
				Dompet Terhubung (Derived Allocation)
			</div>
			<p class="mb-3 text-xs text-[#787774]">
				Nilai tabungan goal ini dikonsolidasikan otomatis secara live dari dompet di bawah ini:
			</p>
			<div class="space-y-2">
				{#each linked as lw (lw.walletId)}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="flex cursor-pointer items-center justify-between rounded-lg border border-[#EAEAEA] bg-white p-3 transition-all hover:border-[#C8C6BF]"
						onclick={() => openWallet(lw.walletId)}
					>
						<div>
							<div class="text-xs font-semibold text-[#111111]">{lw.walletName}</div>
							<div class="text-[11px] text-[#787774]">
								{lw.currency}
								{lw.usedPeg ? '· Kurs live peg' : '· Saldo riil IDR'}
							</div>
						</div>
						<div class="text-right">
							<div class="font-mono text-xs font-semibold text-[#111111]">
								{#if lw.currency !== 'IDR'}
									<span class="text-[#787774]">{fmtCurrency(lw.balance, lw.currency)} ≈ </span>
								{/if}
								<span>{fmtIDR(lw.convertedAmount)}</span>
							</div>
							<div class="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-[#787774]">
								<ArrowRight class="size-2.5" weight="bold" />
								<span>Buka dompet</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
