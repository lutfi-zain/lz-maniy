<script lang="ts">
	import type { ChatMessage } from '@maniyy/shared';
	import ChatUICommandCard from './ChatUICommandCard.svelte';
	import ChatToolInvocation from './ChatToolInvocation.svelte';

	let { message }: { message: ChatMessage } = $props();

	const isUser = $derived(message.role === 'user');

	// Check if content contains a ui_command (agent emitted it in text)
	const uiCommand = $derived.by(() => {
		try {
			const parsed = JSON.parse(message.content);
			if (parsed?.type === 'ui_command') return parsed;
		} catch {
			/* not JSON */
		}
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
		<!-- Tool Invocations (Collapsible Cards) -->
		{#if message.toolInvocations && message.toolInvocations.length > 0}
			<div class="mb-2 flex flex-col gap-1">
				{#each message.toolInvocations as invocation (invocation.toolCallId)}
					<ChatToolInvocation {invocation} />
				{/each}
			</div>
		{/if}

		{#if uiCommand}
			<ChatUICommandCard command={uiCommand} />
		{:else if message.content}
			{message.content}
		{:else if message.role === 'assistant' && (!message.toolInvocations || message.toolInvocations.length === 0)}
			<span class="inline-block size-2 animate-pulse rounded-full bg-[#787774]"></span>
		{/if}
	</div>
</div>
