<script lang="ts">
	import { X, List, Plus } from 'phosphor-svelte';
	import { chatStore } from '$lib/stores/chat.svelte.js';
	import ChatModelPicker from './ChatModelPicker.svelte';

	let { isMobile = false }: { isMobile?: boolean } = $props();
</script>

<header class="flex items-center gap-2 px-3 py-2 border-b border-[#eaeaea] bg-white shrink-0">
	<button
		onclick={() => (chatStore.showConversationList = !chatStore.showConversationList)}
		class="p-1 rounded hover:bg-[#f7f6f3] text-[#787774] transition-colors"
		aria-label="Riwayat percakapan"
	>
		<List size={16} weight="bold" />
	</button>

	<span class="flex-1 text-[13px] font-sans text-[#111111] truncate min-w-0">
		{chatStore.activeConversation?.title ?? 'Percakapan Baru'}
	</span>

	<ChatModelPicker />

	<button
		onclick={() => chatStore.newConversation()}
		class="p-1 rounded hover:bg-[#f7f6f3] text-[#787774] transition-colors"
		aria-label="Percakapan baru"
	>
		<Plus size={16} weight="bold" />
	</button>

	<button
		onclick={() => chatStore.togglePanel(false)}
		class="p-1 rounded hover:bg-[#f7f6f3] text-[#787774] transition-colors"
		aria-label="Tutup panel"
	>
		<X size={16} weight="bold" />
	</button>
</header>
