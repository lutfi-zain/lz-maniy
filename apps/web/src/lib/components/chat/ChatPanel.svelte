<script lang="ts">
	import { chatStore } from '$lib/stores/chat.svelte.js';
	import ChatPanelHeader from './ChatPanelHeader.svelte';
	import ChatMessages from './ChatMessages.svelte';
	import ChatInput from './ChatInput.svelte';
	import ChatResizeHandle from './ChatResizeHandle.svelte';
	import ConversationList from './ConversationList.svelte';

	let isMobile = $state(false);

	const widthTier = $derived(
		chatStore.maximized ? 'full' : chatStore.panelWidth >= 480 ? 'full' : chatStore.panelWidth >= 360 ? 'compact' : 'minimal'
	);

	$effect(() => {
		const mq = window.matchMedia('(max-width: 1023px)');
		isMobile = mq.matches;
		const handler = (e: MediaQueryListEvent) => (isMobile = e.matches);
		mq.addEventListener('change', handler);
		return () => mq.removeEventListener('change', handler);
	});

	$effect(() => {
		if (chatStore.panelOpen) {
			chatStore.resumeLastConversationIfFresh();
		}
	});
</script>

{#if chatStore.panelOpen}
	{#if isMobile}
		<!-- Mobile: fullscreen overlay -->
		<div class="fixed inset-0 z-50 flex flex-col bg-white" role="dialog" aria-label="Agent Chat">
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
		class="fixed top-0 right-0 z-40 flex h-full flex-col border-l border-[#eaeaea] bg-white shadow-sm"
		style={chatStore.maximized
			? 'left: 1rem; width: auto;'
			: `width: ${chatStore.panelWidth}px; transition: none;`}
		aria-label="Agent Chat"
	>
		{#if !chatStore.maximized}
			<ChatResizeHandle />
		{/if}
		<ChatPanelHeader {isMobile} tier={widthTier} />
			<div class="flex flex-1 overflow-hidden">
				{#if chatStore.showConversationList}
					<ConversationList />
				{:else}
					<div class="flex flex-1 flex-col overflow-hidden">
						<ChatMessages />
						<ChatInput />
					</div>
				{/if}
			</div>
		</aside>
	{/if}
{/if}
