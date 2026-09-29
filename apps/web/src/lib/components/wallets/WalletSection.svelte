<script lang="ts">
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import WalletCard from './WalletCard.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import Wallet from 'phosphor-svelte/lib/Wallet';

	const spendableCount = $derived(reedrichStore.spendableWallets.length);
	const lockedCount = $derived(reedrichStore.lockedWallets.length);
	const allCount = $derived(reedrichStore.allWallets.length);
</script>

<section id="sec-wallets" class="mb-5 rounded-xl border border-[#EAEAEA] bg-white p-5 md:p-6">
	<div
		class="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-[#EAEAEA] pb-3"
	>
		<div>
			<h2 class="serif flex items-center gap-2 text-xl font-medium text-[#111111] md:text-2xl">
				<Wallet class="size-5 text-[#111111]" weight="bold" />
				<span>{t('accounts.allWallets')}</span>
			</h2>
			<div class="mt-0.5 text-xs text-[#787774]">
				{t('accounts.clickToInspect')}
			</div>
		</div>

		<div class="flex items-center gap-2">
			{#if reedrichStore.selectedInstitution}
				<span
					class="rounded-full bg-[#111111] px-2 py-0.5 font-mono text-[10px] text-white uppercase"
				>
					Filter: {reedrichStore.selectedInstitution}
				</span>
			{/if}
			<span
				class="rounded-full border border-[#EAEAEA] bg-[#F9F9F8] px-2.5 py-0.5 font-mono text-[11px] text-[#787774] uppercase"
			>
				{t('accounts.walletCount', { count: reedrichStore.filteredWallets.length })}
			</span>
		</div>
	</div>

	<!-- Filter Tabs -->
	<div class="mb-4 flex flex-wrap gap-1.5">
		<button
			type="button"
			class="cursor-pointer rounded-md border border-[#EAEAEA] px-3 py-1 text-xs transition-all {reedrichStore.activeTab ===
			'all'
				? 'border-[#111111] bg-[#111111] text-white'
				: 'bg-[#F9F9F8] text-[#787774] hover:bg-[#111111] hover:text-white'}"
			onclick={() => reedrichStore.setTab('all')}
		>
			{t('common.all')} ({allCount})
		</button>
		<button
			type="button"
			class="cursor-pointer rounded-md border border-[#EAEAEA] px-3 py-1 text-xs transition-all {reedrichStore.activeTab ===
			'spendable'
				? 'border-[#111111] bg-[#111111] text-white'
				: 'bg-[#F9F9F8] text-[#787774] hover:bg-[#111111] hover:text-white'}"
			onclick={() => reedrichStore.setTab('spendable')}
		>
			{t('ledger.summary.spendable')} ({spendableCount})
		</button>
		<button
			type="button"
			class="cursor-pointer rounded-md border border-[#EAEAEA] px-3 py-1 text-xs transition-all {reedrichStore.activeTab ===
			'locked'
				? 'border-[#111111] bg-[#111111] text-white'
				: 'bg-[#F9F9F8] text-[#787774] hover:bg-[#111111] hover:text-white'}"
			onclick={() => reedrichStore.setTab('locked')}
		>
			{t('ledger.summary.locked')} ({lockedCount})
		</button>
	</div>

	<!-- Wallet Cards Grid -->
	<div class="grid grid-cols-1 gap-2.5">
		{#each reedrichStore.filteredWallets as wallet (wallet.walletId)}
			<WalletCard {wallet} />
		{:else}
			<div class="py-8 text-center font-mono text-xs text-[#787774]">
				{t('common.empty')}
			</div>
		{/each}
	</div>
</section>
