<script lang="ts">
	import { Trash, Plus } from 'phosphor-svelte';
	import { chatStore } from '$lib/stores/chat.svelte.js';
	import { onMount } from 'svelte';
	import ChatExportImport from './ChatExportImport.svelte';

	onMount(() => chatStore.loadConversations());

	function selectConversation(id: string) {
		chatStore.loadConversation(id);
		chatStore.showConversationList = false;
	}

	async function deleteConv(id: string, e: MouseEvent) {
		e.stopPropagation();
		if (confirm('Hapus percakapan ini?')) {
			await chatStore.deleteConversation(id);
		}
	}

	function formatRelative(ts: number): string {
		const diff = Date.now() - ts;
		const mins = Math.floor(diff / 60000);
		if (mins < 60) return `${mins}m lalu`;
		const hrs = Math.floor(mins / 60);
		if (hrs < 24) return `${hrs}j lalu`;
		const days = Math.floor(hrs / 24);
		return `${days}h lalu`;
	}
</script>

<div class="flex flex-col flex-1 overflow-hidden bg-[#f7f6f3]">
	<div class="flex items-center justify-between px-3 py-2 border-b border-[#eaeaea]">
		<span class="text-[11px] text-[#787774] uppercase tracking-wide">Riwayat</span>
		<div class="flex gap-1">
			<ChatExportImport />
			<button
				onclick={() => {
					chatStore.newConversation();
					chatStore.showConversationList = false;
				}}
				class="p-1 rounded hover:bg-[#eaeaea] text-[#787774] transition-colors"
				aria-label="Percakapan baru"
			>
				<Plus size={14} weight="bold" />
			</button>
		</div>
	</div>

	<div class="flex-1 overflow-y-auto">
		{#each chatStore.conversations as conv (conv.id)}
			<div
				class="w-full text-left px-3 py-2.5 border-b border-[#eaeaea] hover:bg-white transition-colors group flex items-center justify-between gap-2 cursor-pointer
					{chatStore.activeConversationId === conv.id ? 'bg-white' : ''}"
				onclick={() => selectConversation(conv.id)}
				role="button"
				tabindex="0"
				onkeypress={(e) => e.key === 'Enter' && selectConversation(conv.id)}
			>
				<div class="min-w-0 flex-1">
					<p class="text-[12px] text-[#111111] truncate">{conv.title}</p>
					<p class="text-[11px] font-mono text-[#787774]">{formatRelative(conv.updatedAt)}</p>
				</div>
				<button
					class="p-1 rounded hover:bg-[#fdebec] text-[#787774] hover:text-[#9f2f2d] opacity-0 group-hover:opacity-100 transition-all shrink-0"
					onclick={(e) => deleteConv(conv.id, e)}
					aria-label="Hapus percakapan"
				>
					<Trash size={12} weight="bold" />
				</button>
			</div>
		{:else}
			<p class="px-3 py-4 text-[12px] text-[#787774]">Belum ada percakapan</p>
		{/each}
	</div>
</div>
