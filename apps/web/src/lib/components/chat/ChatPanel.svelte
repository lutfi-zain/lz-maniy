<script lang="ts">
	import { chatStore } from '$lib/stores/chat.svelte.js';
	import ChatPanelHeader from './ChatPanelHeader.svelte';
	import ChatMessages from './ChatMessages.svelte';
	import ChatInput from './ChatInput.svelte';
	import ChatResizeHandle from './ChatResizeHandle.svelte';
	import ConversationList from './ConversationList.svelte';

	let isMobile = $state(false);

	$effect(() => {
		const mq = window.matchMedia('(max-width: 1023px)');
		isMobile = mq.matches;
		const handler = (e: MediaQueryListEvent) => (isMobile = e.matches);
		mq.addEventListener('change', handler);
		return () => mq.removeEventListener('change', handler);
	});
</script>

{#if chatStore.panelOpen}
	{#if isMobile}
		<!-- Mobile: fullscreen overlay -->
		<div
			class="fixed inset-0 z-50 flex flex-col bg-white"
			role="dialog"
			aria-label="Agent Chat"
		>
			<ChatPanelHeader {isMobile} />
			{#if chatStore.showConversationList}
				<ConversationList />
			{:else}
				<ChatMessages />
				<ChatInput />
			{/if}
		</div>
	{:else}
		<!-- Desktop: right-side panel -->
		<aside
			class="fixed top-0 right-0 h-full z-40 flex flex-col bg-white border-l border-[#eaeaea] shadow-sm"
			style="width: {chatStore.panelWidth}px; transition: none;"
			aria-label="Agent Chat"
		>
			<ChatResizeHandle />
			<ChatPanelHeader {isMobile} />
			<div class="flex flex-1 overflow-hidden">
				{#if chatStore.showConversationList}
					<ConversationList />
				{:else}
					<div class="flex flex-col flex-1 overflow-hidden">
						<ChatMessages />
						<ChatInput />
					</div>
				{/if}
			</div>
		</aside>
	{/if}
{/if}
