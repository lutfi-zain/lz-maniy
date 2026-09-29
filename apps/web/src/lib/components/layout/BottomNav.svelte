<script lang="ts">
	import { page } from '$app/state';
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import Compass from 'phosphor-svelte/lib/Compass';
	import Table from 'phosphor-svelte/lib/Table';
	import Bank from 'phosphor-svelte/lib/Bank';
	import Target from 'phosphor-svelte/lib/Target';
	import Plus from 'phosphor-svelte/lib/Plus';
	import { transactionFormStore } from '$lib/stores/transaction-form.svelte';

	const pathname = $derived(page.url.pathname);

	function isActive(path: string): boolean {
		if (path === '/') return pathname === '/';
		return pathname.startsWith(path);
	}
</script>

<!-- Mobile Sticky Bottom Navigation Bar (Hidden on >= 768px) -->
<nav
	id="bottomNav"
	class="fixed right-0 bottom-0 left-0 z-40 flex h-14 items-center justify-around border-t border-[#EAEAEA] bg-white/95 px-2 backdrop-blur-xs md:hidden"
	aria-label="Mobile Main Navigation"
>
	<!-- Cockpit -->
	<a
		href="/"
		class="relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 no-underline transition-colors {isActive(
			'/'
		)
			? 'text-[#111111]'
			: 'text-[#787774] hover:text-[#111111]'}"
		aria-current={isActive('/') ? 'page' : undefined}
	>
		<Compass class="size-4.5" weight="bold" />
		<span class="text-[10px] tracking-tight {isActive('/') ? 'font-semibold' : 'font-medium'}">
			{t('nav.cockpit')}
		</span>
		{#if isActive('/')}
			<span class="absolute bottom-1 size-1 rounded-full bg-[#111111]"></span>
		{/if}
	</a>

	<!-- Ledger -->
	<a
		href="/ledger"
		class="relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 no-underline transition-colors {isActive(
			'/ledger'
		)
			? 'text-[#111111]'
			: 'text-[#787774] hover:text-[#111111]'}"
		aria-current={isActive('/ledger') ? 'page' : undefined}
	>
		<div class="relative">
			<Table class="size-4.5" weight="bold" />
			<span
				class="absolute -top-1 -right-3.5 rounded-full bg-[#F0EFEC] px-1 font-mono text-[8px] font-bold text-[#787774]"
			>
				359
			</span>
		</div>
		<span
			class="text-[10px] tracking-tight {isActive('/ledger') ? 'font-semibold' : 'font-medium'}"
		>
			{t('nav.ledger')}
		</span>
		{#if isActive('/ledger')}
			<span class="absolute bottom-1 size-1 rounded-full bg-[#111111]"></span>
		{/if}
	</a>

	<!-- Center Action: Record New Transaction -->
	<div class="flex items-center justify-center px-1">
		<button
			type="button"
			onclick={() => transactionFormStore.openCreate()}
			class="-mt-3.5 flex size-10 cursor-pointer items-center justify-center rounded-xl bg-[#111111] text-white shadow-md transition-transform hover:bg-[#333333] active:scale-95"
			title={t('nav.recordTitle')}
			aria-label={t('nav.recordTitle')}
		>
			<Plus class="size-5" weight="bold" />
		</button>
	</div>

	<!-- Accounts & Banking -->
	<a
		href="/accounts"
		class="relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 no-underline transition-colors {isActive(
			'/accounts'
		)
			? 'text-[#111111]'
			: 'text-[#787774] hover:text-[#111111]'}"
		aria-current={isActive('/accounts') ? 'page' : undefined}
	>
		<div class="relative">
			<Bank class="size-4.5" weight="bold" />
			<span
				class="absolute -top-1 -right-3 rounded-full bg-[#F0EFEC] px-1 font-mono text-[8px] font-bold text-[#787774]"
			>
				{reedrichStore.allWallets.length}
			</span>
		</div>
		<span
			class="text-[10px] tracking-tight {isActive('/accounts') ? 'font-semibold' : 'font-medium'}"
		>
			{t('nav.accounts')}
		</span>
		{#if isActive('/accounts')}
			<span class="absolute bottom-1 size-1 rounded-full bg-[#111111]"></span>
		{/if}
	</a>

	<!-- Planning -->
	<a
		href="/planning"
		class="relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 no-underline transition-colors {isActive(
			'/planning'
		)
			? 'text-[#111111]'
			: 'text-[#787774] hover:text-[#111111]'}"
		aria-current={isActive('/planning') ? 'page' : undefined}
	>
		<Target class="size-4.5" weight="bold" />
		<span
			class="text-[10px] tracking-tight {isActive('/planning') ? 'font-semibold' : 'font-medium'}"
		>
			{t('nav.planning')}
		</span>
		{#if isActive('/planning')}
			<span class="absolute bottom-1 size-1 rounded-full bg-[#111111]"></span>
		{/if}
	</a>
</nav>
