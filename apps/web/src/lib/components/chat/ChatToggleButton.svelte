<script lang="ts">
	import { ChatCircle } from 'phosphor-svelte';
	import { chatStore } from '$lib/stores/chat.svelte.js';
</script>

<button
	onclick={() => chatStore.togglePanel()}
	class="flex items-center gap-1.5 rounded border border-[#eaeaea] px-2 py-1 text-[12px] text-[#787774] transition-colors hover:bg-[#f7f6f3] hover:text-[#111111]"
	aria-label="Buka Agent Chat (Ctrl+K)"
	title="Agent Chat (Ctrl+K)"
>
	<ChatCircle size={15} weight="bold" />
	<span class="hidden sm:inline">Chat</span>
</button>
