<script lang="ts">
	import type { ChatMessage } from '@maniy/shared';
	import { CaretLeft, CaretRight, ArrowClockwise } from 'phosphor-svelte';
	import { chatStore } from '$lib/stores/chat.svelte.js';
	import ChatUICommandCard from './ChatUICommandCard.svelte';
	import ChatToolInvocation from './ChatToolInvocation.svelte';
	import MarkdownContent from './MarkdownContent.svelte';

	let { message }: { message: ChatMessage } = $props();

	const isUser = $derived(message.role === 'user');
	const variants = $derived(message.variants ?? []);
	const variantCount = $derived(variants.length);
	const activeIndex = $derived(message.activeVariantIndex ?? 0);

	const isErrorMessage = $derived(
		!isUser &&
			(message.content.includes('Koneksi terputus') ||
				message.content.startsWith('⚠️') ||
				message.content.includes('⚠️'))
	);

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
			{isUser ? 'bg-[#111111] text-white' : 'border border-[#EAEAEA] bg-white text-[#111111]'}"
	>
		{#if isUser}
			<!-- User text message -->
			<div class="whitespace-pre-wrap">{message.content || '...'}</div>
		{:else}
			<!-- Assistant message -->
			<!-- Model Thinking Accordion -->
			{#if message.thinking}
				<details
					class="mb-2.5 rounded border border-[#EAEAEA] bg-[#FAFAFA] text-xs text-[#787774]"
					open={chatStore.isStreaming && !message.content}
				>
					<summary
						class="flex cursor-pointer items-center gap-1.5 px-2.5 py-1.5 font-medium select-none hover:text-[#111111]"
					>
						<span class="inline-block size-1.5 rounded-full bg-[#787774]"></span>
						<span>{chatStore.isStreaming && !message.content ? 'Sedang berpikir...' : 'Proses berpikir'}</span>
					</summary>
					<div
						class="max-h-48 overflow-y-auto border-t border-[#EAEAEA] px-2.5 py-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-[#555555]"
					>
						{message.thinking}
					</div>
				</details>
			{/if}

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

			<!-- In-bubble Error Retry Banner -->
			{#if isErrorMessage}
				<div class="mt-2.5 flex items-center gap-2 border-t border-[#FDEBEC] pt-2">
					<button
						type="button"
						onclick={() => chatStore.retryMessage(message.id)}
						disabled={chatStore.isStreaming}
						class="flex items-center gap-1.5 rounded bg-[#FDEBEC] px-2.5 py-1 text-[11px] font-medium text-[#C23934] transition-colors hover:bg-[#FCD8D7] disabled:opacity-50"
					>
						<ArrowClockwise size={12} weight="bold" />
						<span>Coba Lagi</span>
					</button>
				</div>
			{/if}

			<!-- Footer Actions: Version Pager & Retry Button -->
			{#if (message.content || (message.toolInvocations && message.toolInvocations.length > 0)) && !chatStore.isStreaming}
				<div
					class="mt-2.5 flex items-center justify-between border-t border-[#EAEAEA] pt-2 text-[11px] text-[#787774]"
				>
					{#if variantCount > 1}
						<div class="flex items-center gap-1">
							<button
								type="button"
								onclick={() => chatStore.switchMessageVariant(message.id, activeIndex - 1)}
								disabled={activeIndex <= 0 || chatStore.isStreaming}
								class="rounded p-0.5 transition-colors hover:bg-[#F7F6F3] disabled:pointer-events-none disabled:opacity-30"
								aria-label="Versi sebelumnya"
								title="Versi sebelumnya"
							>
								<CaretLeft size={12} weight="bold" />
							</button>
							<span class="font-mono text-[10px]">{activeIndex + 1} / {variantCount}</span>
							<button
								type="button"
								onclick={() => chatStore.switchMessageVariant(message.id, activeIndex + 1)}
								disabled={activeIndex >= variantCount - 1 || chatStore.isStreaming}
								class="rounded p-0.5 transition-colors hover:bg-[#F7F6F3] disabled:pointer-events-none disabled:opacity-30"
								aria-label="Versi berikutnya"
								title="Versi berikutnya"
							>
								<CaretRight size={12} weight="bold" />
							</button>
						</div>
					{:else}
						<div></div>
					{/if}

					<button
						type="button"
						onclick={() => chatStore.retryMessage(message.id)}
						disabled={chatStore.isStreaming}
						class="flex items-center gap-1 rounded px-1.5 py-0.5 text-[#787774] transition-colors hover:bg-[#F7F6F3] hover:text-[#111111] disabled:opacity-40"
						title="Ulang jawaban (Retry)"
						aria-label="Ulang jawaban"
					>
						<ArrowClockwise size={12} weight="bold" />
						<span>Ulang</span>
					</button>
				</div>
			{/if}
		{/if}
	</div>
</div>
