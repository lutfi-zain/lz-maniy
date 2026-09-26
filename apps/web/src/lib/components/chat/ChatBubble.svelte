<script lang="ts">
	import type { ChatMessage } from '@maniyy/shared';
	import ChatUICommandCard from './ChatUICommandCard.svelte';
	import ChatToolInvocation from './ChatToolInvocation.svelte';
	import MarkdownContent from './MarkdownContent.svelte';

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
		class="max-w-[88%] rounded-lg px-3.5 py-2.5 text-[13px] leading-relaxed break-words
			{isUser
				? 'bg-[#111111] text-white'
				: 'bg-white border border-[#EAEAEA] text-[#111111]'}"
	>
		{#if isUser}
			<!-- User text message -->
			<div class="whitespace-pre-wrap">{message.content || '...'}</div>
		{:else}
			<!-- Assistant message -->
			<!-- Tool Invocations (Collapsible Cards) -->
			{#if message.toolInvocations && message.toolInvocations.length > 0}
				<div class="mb-2 flex flex-col gap-1.5">
					{#each message.toolInvocations as invocation (invocation.toolCallId)}
						<ChatToolInvocation {invocation} />
					{/each}
				</div>
			{/if}

			{#if uiCommand}
				<ChatUICommandCard command={uiCommand} />
			{:else if message.content}
				<MarkdownContent content={message.content} />
			{:else}
				<div class="flex items-center gap-1.5 py-1 text-xs text-[#787774]">
					<span class="inline-block size-2 animate-pulse rounded-full bg-[#111111]"></span>
					<span class="font-medium">Menyusun jawaban...</span>
				</div>
			{/if}
		{/if}
	</div>
</div>
