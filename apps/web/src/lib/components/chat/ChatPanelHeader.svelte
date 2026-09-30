<script lang="ts">
	import { X, List, Plus } from 'phosphor-svelte';
	import { chatStore } from '$lib/stores/chat.svelte.js';
	import ChatModelPicker from './ChatModelPicker.svelte';

	let { isMobile = false }: { isMobile?: boolean } = $props();
</script>

<header class="flex shrink-0 items-center gap-2 border-b border-[#eaeaea] bg-white px-3 py-2">
	<button
		onclick={() => (chatStore.showConversationList = !chatStore.showConversationList)}
		class="rounded p-1 text-[#787774] transition-colors hover:bg-[#f7f6f3]"
		aria-label="Riwayat percakapan"
	>
		<List size={16} weight="bold" />
	</button>

	<span class="min-w-0 flex-1 truncate font-sans text-[13px] text-[#111111]">
		{chatStore.activeConversation?.title ?? 'Percakapan Baru'}
	</span>

	<ChatModelPicker />

	<button
		onclick={() => chatStore.newConversation()}
		class="rounded p-1 text-[#787774] transition-colors hover:bg-[#f7f6f3]"
		aria-label="Percakapan baru"
	>
		<Plus size={16} weight="bold" />
	</button>

	<button
		onclick={() => chatStore.togglePanel(false)}
		class="rounded p-1 text-[#787774] transition-colors hover:bg-[#f7f6f3]"
		aria-label="Tutup panel"
	>
		<X size={16} weight="bold" />
	</button>
</header>
