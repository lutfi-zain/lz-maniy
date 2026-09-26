<script lang="ts">
	import type { ChatMessage } from '@maniyy/shared';
	import ChatUICommandCard from './ChatUICommandCard.svelte';

	let { message }: { message: ChatMessage } = $props();

	const isUser = $derived(message.role === 'user');

	// Check if content contains a ui_command (agent emitted it in text)
	const uiCommand = $derived.by(() => {
		try {
			const parsed = JSON.parse(message.content);
			if (parsed?.type === 'ui_command') return parsed;
		} catch { /* not JSON */ }
		return null;
	});
</script>

<div class="flex {isUser ? 'justify-end' : 'justify-start'} gap-2">
	<div
		class="max-w-[85%] rounded-lg px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap break-words
			{isUser
				? 'bg-[#111111] text-white'
				: 'bg-white border border-[#eaeaea] text-[#111111]'}"
	>
		{#if uiCommand}
			<ChatUICommandCard command={uiCommand} />
		{:else}
			{message.content}
		{/if}
	</div>
</div>
