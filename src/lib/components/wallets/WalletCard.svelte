<script lang="ts">
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { fmtCurrency, fmtIDR } from '$lib/utils/currency';
	import type { WalletItem } from '$lib/types/account-detail';
	import Bank from 'phosphor-svelte/lib/Bank';
	import DeviceMobile from 'phosphor-svelte/lib/DeviceMobile';
	import Money from 'phosphor-svelte/lib/Money';
	import CurrencyBtc from 'phosphor-svelte/lib/CurrencyBtc';
	import ArrowRight from 'phosphor-svelte/lib/ArrowRight';
	import ClockCounterClockwise from 'phosphor-svelte/lib/ClockCounterClockwise';

	let { wallet }: { wallet: WalletItem } = $props();

	const isLocked = $derived(wallet.isLocked === 1);
	const lt = $derived(wallet.lastTransaction);

	function handleClick() {
		reedrichStore.openDrawer({
			type: 'wallet',
			title: wallet.walletName,
			subtitle: `${wallet.institution} · Tipe: ${wallet.type} · Mata Uang: ${wallet.currency}`,
			badge: isLocked ? 'DOMPET TERKUNCI' : 'DOMPET SPENDABLE',
			data: { wallet }
		});
		reedrichStore.fetchTransactionsForDrawer({ walletId: wallet.walletId, limit: 50 });
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="group relative flex cursor-pointer flex-col justify-between rounded-lg border border-[#EAEAEA] bg-white p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-[#C8C6BF] hover:shadow-xs"
	onclick={handleClick}
>
	<div>
		<div class="flex items-start justify-between gap-3">
			<div>
				<div class="flex items-center gap-2 text-sm font-semibold text-[#111111]">
					{#if wallet.type === 'crypto'}
						<CurrencyBtc class="size-4 text-[#787774]" weight="bold" />
					{:else if wallet.type === 'e-wallet'}
						<DeviceMobile class="size-4 text-[#787774]" weight="bold" />
					{:else if wallet.type === 'cash'}
						<Money class="size-4 text-[#787774]" weight="bold" />
					{:else}
						<Bank class="size-4 text-[#787774]" weight="bold" />
					{/if}
					<span>{wallet.walletName}</span>
				</div>

				<div class="mt-1 flex items-center gap-1.5">
					<span
						class="rounded-full bg-[#EFEFED] px-2 py-0.5 text-[10px] font-medium tracking-wider text-[#111111] uppercase"
					>
						{wallet.institution}
					</span>
					<span
						class="rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase {isLocked
							? 'bg-[#FBF3DB] text-[#956400]'
							: 'bg-[#EDF3EC] text-[#346538]'}"
					>
						{isLocked ? 'Locked' : 'Spendable'}
					</span>
				</div>
			</div>

			<div class="font-mono text-base font-semibold text-[#111111]">
				{fmtCurrency(wallet.balance, wallet.currency)}
			</div>
		</div>

		{#if lt}
			<div
				class="mt-3 flex items-center justify-between gap-2 rounded-md border border-black/5 bg-[#F9F9F8] px-2.5 py-1.5 text-xs text-[#2F3437]"
			>
				<span class="flex max-w-[70%] items-center gap-1 truncate text-[#787774]">
					<ClockCounterClockwise class="size-3 shrink-0" weight="bold" />
					<span class="truncate">{lt.description || lt.category}</span>
				</span>
				<span
					class="font-mono font-medium whitespace-nowrap {lt.direction === 'in'
						? 'text-[#346538]'
						: 'text-[#111111]'}"
				>
					{lt.direction === 'in' ? '+' : '−'}
					{fmtIDR(lt.amount)}
				</span>
			</div>
		{:else}
			<div
				class="mt-3 rounded-md border border-black/5 bg-[#F9F9F8] px-2.5 py-1.5 text-xs text-[#787774]"
			>
				Belum ada mutasi baru
			</div>
		{/if}
	</div>

	<div
		class="mt-3 flex items-center gap-1 text-[11px] text-[#787774] transition-colors group-hover:text-[#111111]"
	>
		<ArrowRight class="size-3" weight="bold" />
		<span>Buka riwayat mutasi dompet</span>
	</div>
</div>
