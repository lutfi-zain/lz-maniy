<script lang="ts">
	import { chatStore } from '$lib/stores/chat.svelte.js';
	import { Coins } from 'phosphor-svelte';

	const isLow = $derived(
		chatStore.creditsRemaining !== null && chatStore.creditsRemaining <= 100
	);
	const isZero = $derived(
		chatStore.creditsRemaining !== null && chatStore.creditsRemaining <= 0
	);
</script>

<div
	class="inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-medium transition-all duration-300
		{chatStore.lastCreditsUsed !== null ? 'ring-2 ring-[#C23934]/30 shadow-sm' : ''}
		{isZero
			? 'border-[#FDEBEC] bg-[#FDEBEC] text-[#C23934]'
			: isLow
				? 'border-[#FBF3DB] bg-[#FBF3DB] text-[#8C6D1F]'
				: 'border-[#EAEAEA] bg-[#FAFAFA] text-[#555555]'}"
	title="Sisa kredit AI"
>
	<Coins size={12} weight="bold" />
	<span>
		{chatStore.creditsRemaining !== null
			? `${Math.floor(chatStore.creditsRemaining).toLocaleString()} cr`
			: '...'}
	</span>
	{#if chatStore.lastCreditsUsed !== null}
		<span class="font-mono text-[10px] text-[#C23934] animate-pulse">
			-{chatStore.lastCreditsUsed}
		</span>
	{/if}
</div>
