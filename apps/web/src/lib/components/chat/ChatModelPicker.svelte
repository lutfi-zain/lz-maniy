<script lang="ts">
	import { chatStore } from '$lib/stores/chat.svelte.js';
	import { onMount } from 'svelte';

	let open = $state(false);

	onMount(() => chatStore.loadModels());

	function selectModel(model: (typeof chatStore.availableModels)[0]) {
		chatStore.setModel(model);
		open = false;
	}

	function toggle() {
		open = !open;
	}
</script>

<div class="relative">
	<button
		onclick={toggle}
		class="text-[11px] text-[#787774] px-2 py-0.5 rounded border border-[#eaeaea] hover:bg-[#f7f6f3] transition-colors whitespace-nowrap"
		aria-label="Pilih model AI"
	>
		{chatStore.selectedModel.displayName}
	</button>

	{#if open}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="absolute right-0 top-full mt-1 z-50 bg-white border border-[#eaeaea] rounded shadow-sm min-w-[180px] py-1"
			role="menu"
		>
			{#each chatStore.availableModels as model (model.model)}
				<button
					role="menuitem"
					class="w-full text-left px-3 py-1.5 text-[12px] hover:bg-[#f7f6f3] transition-colors
						{chatStore.selectedModel.model === model.model ? 'text-[#111111] font-medium' : 'text-[#787774]'}"
					onclick={() => selectModel(model)}
				>
					{model.displayName}
					{#if model.capabilities.vision}
						<span class="ml-1 text-[10px] text-[#1f6c9f]">Vision</span>
					{/if}
				</button>
			{/each}
		</div>

		<!-- Backdrop to close -->
		<div
			class="fixed inset-0 z-40"
			role="presentation"
			onclick={() => (open = false)}
		></div>
	{/if}
</div>
