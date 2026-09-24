<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Topbar from '$lib/components/layout/Topbar.svelte';
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
	<main class="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5 sm:px-6">
		{@render children()}
	</main>
	<footer
		class="border-t border-[#EAEAEA] bg-white py-4 text-center font-mono text-[11px] text-[#787774]"
	>
		Maniyy Cockpit · Svelte 5 + Tailwind · Status: {reedrichStore.isLive
			? 'Live Edge'
			: 'Mock Cache'}
	</footer>
</div>
