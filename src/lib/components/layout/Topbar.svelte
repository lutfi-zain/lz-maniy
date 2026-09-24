<script lang="ts">
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import ShieldCheck from 'phosphor-svelte/lib/ShieldCheck';
	import ArrowsClockwise from 'phosphor-svelte/lib/ArrowsClockwise';
	import Wallet from 'phosphor-svelte/lib/Wallet';
	import ChartBar from 'phosphor-svelte/lib/ChartBar';
	import ChartPieSlice from 'phosphor-svelte/lib/ChartPieSlice';
	import Target from 'phosphor-svelte/lib/Target';
	import Handshake from 'phosphor-svelte/lib/Handshake';
	import Key from 'phosphor-svelte/lib/Key';

	function scrollSection(id: string) {
		const el = document.getElementById(id);
		if (el) el.scrollIntoView({ behavior: 'smooth' });
	}

	function handleRefresh() {
		reedrichStore.fetchSnapshot();
	}

	function handleMock() {
		reedrichStore.loadMock();
	}
</script>

<header class="sticky top-0 z-30 border-b border-[#EAEAEA] bg-[#F7F6F3]/90 backdrop-blur-md">
	<div class="mx-auto flex max-w-[1320px] items-center gap-4 px-6 py-3 md:px-8">
		<a href="#top" class="flex items-center gap-2.5 font-semibold text-[#111111] no-underline">
			<ShieldCheck class="size-6 text-[#111111]" weight="bold" />
			<div>
				<span class="text-base font-semibold tracking-tight">Maniyy</span>
				<small class="block text-[10px] font-normal tracking-wider text-[#787774] uppercase">
					Account Detail Intelligence
				</small>
			</div>
		</a>

		<nav class="ml-4 hidden items-center gap-1 md:flex">
			<button
				type="button"
				class="flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-[#787774] transition-colors hover:bg-white hover:text-[#111111] hover:shadow-xs"
				onclick={() => scrollSection('sec-wallets')}
			>
				<Wallet class="size-3.5" weight="bold" />
				<span>Dompet ({reedrichStore.allWallets.length})</span>
			</button>
			<button
				type="button"
				class="flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-[#787774] transition-colors hover:bg-white hover:text-[#111111] hover:shadow-xs"
				onclick={() => scrollSection('sec-cashflow')}
			>
				<ChartBar class="size-3.5" weight="bold" />
				<span>Arus Kas</span>
			</button>
			<button
				type="button"
				class="flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-[#787774] transition-colors hover:bg-white hover:text-[#111111] hover:shadow-xs"
				onclick={() => scrollSection('sec-budgets')}
			>
				<ChartPieSlice class="size-3.5" weight="bold" />
				<span>Budget</span>
			</button>
			<button
				type="button"
				class="flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-[#787774] transition-colors hover:bg-white hover:text-[#111111] hover:shadow-xs"
				onclick={() => scrollSection('sec-goals')}
			>
				<Target class="size-3.5" weight="bold" />
				<span>Goals</span>
			</button>
			<button
				type="button"
				class="flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-[#787774] transition-colors hover:bg-white hover:text-[#111111] hover:shadow-xs"
				onclick={() => scrollSection('sec-obligations')}
			>
				<Handshake class="size-3.5" weight="bold" />
				<span>Kewajiban</span>
			</button>
		</nav>

		<div class="ml-auto flex items-center gap-3">
			<div class="flex items-center gap-2">
				<span
					class="size-2 rounded-full {reedrichStore.isLive ? 'bg-[#346538]' : 'bg-[#C9C4B8]'}"
					title={reedrichStore.isLive ? 'Live API Connected' : 'Offline / Mock Cache'}
				></span>
				<span class="font-mono text-[11px] text-[#787774]">
					{reedrichStore.isLive ? 'LIVE' : 'MOCK'}
				</span>
			</div>
			<kbd class="hidden sm:inline-block">IDR</kbd>
		</div>
	</div>

	<!-- Secondary Subbar with Token Controls -->
	<div class="border-t border-[#EAEAEA] bg-white px-6 py-2 md:px-8">
		<div class="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3 text-xs">
			<div class="flex min-w-[280px] flex-1 items-center gap-2">
				<Key class="size-4 text-[#787774]" weight="bold" />
				<input
					type="text"
					bind:value={reedrichStore.apiToken}
					placeholder="API Key atau Bearer token..."
					class="w-full max-w-sm rounded border border-[#EAEAEA] bg-[#F9F9F8] px-2.5 py-1 font-mono text-xs text-[#111111] focus:border-[#111111] focus:outline-hidden"
				/>
				<button
					type="button"
					onclick={handleRefresh}
					disabled={reedrichStore.isLoading}
					class="flex cursor-pointer items-center gap-1.5 rounded bg-[#111111] px-3 py-1 text-xs text-white transition-transform hover:bg-[#333333] active:scale-98 disabled:opacity-50"
				>
					<ArrowsClockwise
						class="size-3.5 {reedrichStore.isLoading ? 'animate-spin' : ''}"
						weight="bold"
					/>
					<span>Sinkronkan</span>
				</button>
				<button
					type="button"
					onclick={handleMock}
					class="cursor-pointer rounded border border-[#EAEAEA] bg-white px-2.5 py-1 text-xs text-[#111111] hover:bg-[#F9F9F8]"
				>
					Pakai Mock
				</button>
			</div>

			<span class="font-mono text-[11px] text-[#787774]">
				{reedrichStore.statusMessage}
			</span>
		</div>
	</div>
</header>
