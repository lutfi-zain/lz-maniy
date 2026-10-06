<script lang="ts">
	import { X, List, Plus, ArrowsOut, ArrowsIn } from 'phosphor-svelte';
	import { chatStore } from '$lib/stores/chat.svelte.js';
	import ChatModelPicker from './ChatModelPicker.svelte';
	import CreditIndicator from './CreditIndicator.svelte';
	import ContextGauge from './ContextGauge.svelte';

	let { isMobile = false, tier = 'full' }: { isMobile?: boolean; tier?: 'full' | 'compact' | 'minimal' } = $props();
</script>

<header class="flex shrink-0 items-center gap-1.5 border-b border-[#eaeaea] bg-white px-2.5 py-2 sm:gap-2 sm:px-3">
	<button
		onclick={() => (chatStore.showConversationList = !chatStore.showConversationList)}
		class="shrink-0 rounded p-1 text-[#787774] transition-colors hover:bg-[#f7f6f3]"
		aria-label="Riwayat percakapan"
	>
		<List size={16} weight="bold" />
	</button>

	<span class="min-w-0 flex-1 truncate font-sans text-[13px] text-[#111111]">
		{chatStore.activeConversation?.title ?? 'Percakapan Baru'}
	</span>

	{#if tier === 'full'}
		<CreditIndicator />
		<ContextGauge />
	{/if}
	{#if tier !== 'minimal'}
		<ChatModelPicker compact={tier === 'compact'} />
	{/if}
	<button
		onclick={() => chatStore.newConversation()}
		class="shrink-0 rounded p-1 text-[#787774] transition-colors hover:bg-[#f7f6f3]"
		aria-label="Percakapan baru"
	>
		<Plus size={16} weight="bold" />
	</button>


	{#if !isMobile}
		<button
			onclick={() => chatStore.toggleMaximize()}
			class="shrink-0 rounded p-1 text-[#787774] transition-colors hover:bg-[#f7f6f3]"
			aria-label={chatStore.maximized ? 'Kembalikan ukuran panel' : 'Maksimalkan panel'}
			title={chatStore.maximized ? 'Kembalikan ukuran panel' : 'Maksimalkan panel'}
		>
			{#if chatStore.maximized}
				<ArrowsIn size={16} weight="bold" />
			{:else}
				<ArrowsOut size={16} weight="bold" />
			{/if}
		</button>
	{/if}
	<button
		onclick={() => chatStore.togglePanel(false)}
		class="shrink-0 rounded p-1 text-[#787774] transition-colors hover:bg-[#f7f6f3]"
		aria-label="Tutup panel"
	>
		<X size={16} weight="bold" />
	</button>
</header>
