<script lang="ts">
	import { page } from '$app/state';
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import ShieldCheck from 'phosphor-svelte/lib/ShieldCheck';
	import ArrowsClockwise from 'phosphor-svelte/lib/ArrowsClockwise';
	import Table from 'phosphor-svelte/lib/Table';
	import Bank from 'phosphor-svelte/lib/Bank';
	import Compass from 'phosphor-svelte/lib/Compass';
	import Target from 'phosphor-svelte/lib/Target';
	import Key from 'phosphor-svelte/lib/Key';

	const pathname = $derived(page.url.pathname);

	function isActive(path: string): boolean {
		if (path === '/') return pathname === '/';
		return pathname.startsWith(path);
	}
</script>

<header class="sticky top-0 z-30 border-b border-[#EAEAEA] bg-white">
	<!-- Primary Navigation Bar -->
	<div
		class="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2.5 px-3 py-2 sm:px-6"
	>
		<div class="flex max-w-full items-center gap-3 overflow-x-auto sm:gap-6">
			<a
				href="/"
				class="flex shrink-0 items-center gap-1.5 font-semibold text-[#111111] no-underline"
			>
				<ShieldCheck class="size-5 text-[#111111]" weight="bold" />
				<span class="text-sm font-semibold tracking-tight">Maniyy</span>
			</a>

			<nav class="flex shrink-0 items-center gap-1 overflow-x-auto">
				<a
					href="/"
					class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium no-underline transition-colors {isActive(
						'/'
					)
						? 'bg-[#111111] text-white'
						: 'text-[#787774] hover:bg-[#F9F9F8] hover:text-[#111111]'}"
				>
					<Compass class="size-3.5" weight="bold" />
					<span>Cockpit</span>
				</a>

				<a
					href="/ledger"
					class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium no-underline transition-colors {isActive(
						'/ledger'
					)
						? 'bg-[#111111] text-white'
						: 'text-[#787774] hover:bg-[#F9F9F8] hover:text-[#111111]'}"
				>
					<Table class="size-3.5" weight="bold" />
					<span>Ledger</span>
					<span
						class="py-0.2 rounded-full px-1.5 font-mono text-[10px] {isActive('/ledger')
							? 'bg-white/20 text-white'
							: 'bg-[#F0EFEC] text-[#787774]'}"
					>
						359
					</span>
				</a>

				<a
					href="/accounts"
					class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium no-underline transition-colors {isActive(
						'/accounts'
					)
						? 'bg-[#111111] text-white'
						: 'text-[#787774] hover:bg-[#F9F9F8] hover:text-[#111111]'}"
				>
					<Bank class="size-3.5" weight="bold" />
					<span>Akun & Bank</span>
					<span
						class="py-0.2 rounded-full px-1.5 font-mono text-[10px] {isActive('/accounts')
							? 'bg-white/20 text-white'
							: 'bg-[#F0EFEC] text-[#787774]'}"
					>
						{reedrichStore.allWallets.length}
					</span>
				</a>

				<a
					href="/planning"
					class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium no-underline transition-colors {isActive(
						'/planning'
					)
						? 'bg-[#111111] text-white'
						: 'text-[#787774] hover:bg-[#F9F9F8] hover:text-[#111111]'}"
				>
					<Target class="size-3.5" weight="bold" />
					<span>Perencanaan</span>
				</a>
			</nav>
		</div>

		<!-- Right Connection & Live Sync Bar -->
		<div class="flex items-center gap-3">
			<div class="hidden items-center gap-2 lg:flex">
				<Key class="size-3.5 text-[#787774]" weight="bold" />
				<input
					type="text"
					bind:value={reedrichStore.apiToken}
					placeholder="API Key..."
					class="w-48 rounded border border-[#EAEAEA] bg-[#F9F9F8] px-2 py-1 font-mono text-[11px] text-[#111111] focus:border-[#111111] focus:outline-hidden"
				/>
				<button
					type="button"
					onclick={() => reedrichStore.fetchSnapshot()}
					disabled={reedrichStore.isLoading}
					class="flex cursor-pointer items-center gap-1 rounded bg-[#111111] px-2.5 py-1 text-xs font-medium text-white transition-transform hover:bg-[#333333] active:scale-98 disabled:opacity-50"
				>
					<ArrowsClockwise
						class="size-3 {reedrichStore.isLoading ? 'animate-spin' : ''}"
						weight="bold"
					/>
					<span>Sync</span>
				</button>
			</div>

			<div class="flex items-center gap-2 border-l border-[#EAEAEA] pl-3">
				<span
					class="size-2 rounded-full {reedrichStore.isLive ? 'bg-[#346538]' : 'bg-[#C9C4B8]'}"
					title={reedrichStore.isLive ? 'Live API Connected' : 'Offline / Mock Cache'}
				></span>
				<span class="font-mono text-[11px] text-[#787774]">
					{reedrichStore.isLive ? 'LIVE' : 'MOCK'}
				</span>
				<kbd class="ml-1 text-[10px]">IDR</kbd>
			</div>
		</div>
	</div>
</header>
