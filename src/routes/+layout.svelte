<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import BottomNav from '$lib/components/layout/BottomNav.svelte';
	import { onMount } from 'svelte';
	import { reedrichStore } from '$lib/stores/reedrich.svelte';

	let { children } = $props();

	onMount(() => {
		// Sync live snapshot on mount
		reedrichStore.fetchSnapshot();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div
	class="flex min-h-screen w-full max-w-[100vw] flex-col overflow-x-hidden bg-[#F7F6F3] font-sans text-[#111111]"
>
	<Topbar />
	<main class="mx-auto w-full max-w-[1400px] flex-1 px-3.5 py-4 pb-20 sm:px-6 sm:py-5 sm:pb-6">
		{@render children()}
	</main>
	<footer
		class="mb-14 border-t border-[#EAEAEA] bg-white py-3 text-center font-mono text-[10px] text-[#787774] sm:text-[11px] md:mb-0 md:py-4"
	>
		Maniyy Cockpit · Svelte 5 + Tailwind · Status: {reedrichStore.isLive
			? 'Live Edge'
			: 'Mock Cache'}
	</footer>
	<BottomNav />
</div>
