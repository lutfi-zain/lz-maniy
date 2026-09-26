<script lang="ts">
	import { chatStore } from '$lib/stores/chat.svelte.js';
	import { onMount } from 'svelte';
	import { CaretDown, Check, Sparkle, Lightning } from 'phosphor-svelte';

	let open = $state(false);

	onMount(() => chatStore.loadModels());

	function selectModel(model: (typeof chatStore.availableModels)[0]) {
		chatStore.setModel(model);
		open = false;
	}

	function toggle() {
		open = !open;
	}

	const geminiModels = $derived(chatStore.availableModels.filter((m) => m.provider === 'gemini'));
	const groqModels = $derived(chatStore.availableModels.filter((m) => m.provider === 'groq'));
</script>

<div class="relative">
	<button
		type="button"
		onclick={toggle}
		class="flex items-center gap-1.5 whitespace-nowrap rounded border border-[#EAEAEA] bg-[#F9F9F8] px-2 py-1 text-[11px] font-medium text-[#111111] transition-colors hover:border-[#111111]"
		aria-label="Pilih model AI"
	>
		{#if chatStore.selectedModel.provider === 'gemini'}
			<Sparkle size={12} weight="fill" class="text-[#1F6C9F]" />
		{:else}
			<Lightning size={12} weight="fill" class="text-[#956400]" />
		{/if}
		<span class="max-w-[130px] truncate">{chatStore.selectedModel.displayName}</span>
		<CaretDown size={10} weight="bold" class="text-[#787774]" />
	</button>

	{#if open}
		<!-- Dropdown Menu -->
		<div
			class="absolute right-0 top-full mt-1.5 z-50 flex w-64 flex-col rounded-lg border border-[#EAEAEA] bg-white p-1.5 shadow-lg max-h-80 overflow-y-auto"
			role="menu"
		>
			<!-- Gemini Section -->
			{#if geminiModels.length > 0}
				<div class="px-2 py-1 text-[10px] font-semibold tracking-wider text-[#1F6C9F] uppercase">
					Google Gemini
				</div>
				{#each geminiModels as model (model.model)}
					<button
						type="button"
						role="menuitem"
						class="flex w-full cursor-pointer items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-[#F9F9F8]
							{chatStore.selectedModel.model === model.model ? 'bg-[#F0EFEC] font-semibold text-[#111111]' : 'text-[#787774]'}"
						onclick={() => selectModel(model)}
					>
						<div class="flex items-center gap-1.5 truncate">
							<span class="truncate">{model.displayName}</span>
							{#if model.capabilities.vision}
								<span class="rounded bg-[#E1F3FE] px-1 py-0.2 font-mono text-[9px] text-[#1F6C9F]">Vision</span>
							{/if}
						</div>
						{#if chatStore.selectedModel.model === model.model}
							<Check size={12} weight="bold" class="text-[#111111] shrink-0" />
						{/if}
					</button>
				{/each}
			{/if}

			<!-- Divider -->
			{#if groqModels.length > 0}
				<div class="my-1 border-t border-[#EAEAEA]"></div>
				<div class="px-2 py-1 text-[10px] font-semibold tracking-wider text-[#956400] uppercase">
					Groq LPU (Ultra Fast)
				</div>
				{#each groqModels as model (model.model)}
					<button
						type="button"
						role="menuitem"
						class="flex w-full cursor-pointer items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-[#F9F9F8]
							{chatStore.selectedModel.model === model.model ? 'bg-[#F0EFEC] font-semibold text-[#111111]' : 'text-[#787774]'}"
						onclick={() => selectModel(model)}
					>
						<span class="truncate">{model.displayName}</span>
						{#if chatStore.selectedModel.model === model.model}
							<Check size={12} weight="bold" class="text-[#111111] shrink-0" />
						{/if}
					</button>
				{/each}
			{/if}
		</div>

		<!-- Backdrop to close -->
		<div
			class="fixed inset-0 z-40"
			role="presentation"
			onclick={() => (open = false)}
		></div>
	{/if}
</div>
