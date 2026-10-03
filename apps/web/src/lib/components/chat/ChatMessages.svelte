<script lang="ts">
	import { tick } from 'svelte';
	import { chatStore } from '$lib/stores/chat.svelte.js';
	import ChatBubble from './ChatBubble.svelte';
	import ChatEmptyState from './ChatEmptyState.svelte';
	import ChatStreamingIndicator from './ChatStreamingIndicator.svelte';

	let scrollEl = $state<HTMLDivElement | undefined>(undefined);
	let userScrolledUp = $state(false);
	let prevLength = $state(0);

	$effect(() => {
		const msgs = chatStore.messages;
		if (msgs.length !== prevLength) {
			prevLength = msgs.length;
			if (!userScrolledUp) {
				tick().then(() => {
					if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
				});
			}
		}
	});

	// Also scroll on streaming updates for the last message
	$effect(() => {
		const last = chatStore.messages.at(-1);
		// Track last message content to trigger scroll
		if (last?.content && !userScrolledUp && scrollEl) {
			scrollEl.scrollTop = scrollEl.scrollHeight;
		}
	});

	function onScroll() {
		if (!scrollEl) return;
		const isAtBottom = scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight < 40;
		userScrolledUp = !isAtBottom;
	}
</script>

<div
	bind:this={scrollEl}
	class="flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-3 py-4"
	onscroll={onScroll}
	role="log"
	aria-label="Percakapan"
	aria-live="polite"
>
	{#if chatStore.isLoadingHistory}
		<div class="flex flex-1 flex-col justify-end space-y-3 p-3">
			<div class="h-10 w-2/3 self-end rounded-lg bg-[#F0EFEC] animate-pulse"></div>
			<div class="h-16 w-3/4 rounded-lg bg-[#F0EFEC] animate-pulse"></div>
			<div class="h-12 w-1/2 self-end rounded-lg bg-[#F0EFEC] animate-pulse"></div>
		</div>
	{:else if !chatStore.hasMessages}
		<ChatEmptyState />
	{:else}
		{#each chatStore.messages as message (message.id)}
			{#if message.role === 'system' && message.content.startsWith('[Conversation Summary]')}
				<div
					class="my-1 rounded border border-[#EAEAEA] bg-[#FAFAFA] px-3 py-2 text-center text-[11px] text-[#787774]"
				>
					<span>Riwayat percakapan dirangkum untuk menghemat konteks.</span>
				</div>
			{:else}
				<ChatBubble {message} />
			{/if}
		{/each}
		{#if chatStore.isStreaming}
			<ChatStreamingIndicator />
		{/if}
	{/if}
</div>

{#if userScrolledUp && chatStore.hasMessages}
	<div class="flex justify-center pb-1">
		<button
			class="rounded-full border border-[#eaeaea] bg-white px-3 py-1 text-[11px] text-[#787774] transition-colors hover:bg-[#f7f6f3]"
			onclick={() => {
				userScrolledUp = false;
				if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
			}}
		>
			Lihat pesan terbaru
		</button>
	</div>
{/if}
