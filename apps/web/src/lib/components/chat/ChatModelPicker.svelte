<script lang="ts">
	import { chatStore } from '$lib/stores/chat.svelte.js';
	import { onMount } from 'svelte';
	import { CaretDown, Check, Sparkle, Lightning, Brain } from 'phosphor-svelte';
	import type { ThinkingLevel } from '@maniyy/shared';

	let open = $state(false);
	let thinkingOpen = $state(false);

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

	const availableThinkingLevels = $derived<ThinkingLevel[]>(
		chatStore.selectedModel.thinkingLevels ?? ['off', 'low', 'medium', 'high']
	);
</script>

<div class="flex items-center gap-1.5">
	<!-- Model Selector -->
	<div class="relative">
		<button
			type="button"
			onclick={toggle}
			class="flex items-center gap-1.5 rounded border border-[#EAEAEA] bg-[#F9F9F8] px-2 py-1 text-[11px] font-medium whitespace-nowrap text-[#111111] transition-colors hover:border-[#111111]"
			aria-label="Pilih model AI"
		>
			{#if chatStore.selectedModel.provider === 'gemini'}
				<Sparkle size={12} weight="fill" class="text-[#1F6C9F]" />
			{:else}
				<Lightning size={12} weight="fill" class="text-[#956400]" />
			{/if}
			<span class="max-w-[120px] truncate">{chatStore.selectedModel.displayName}</span>
			<CaretDown size={10} weight="bold" class="text-[#787774]" />
		</button>

		{#if open}
			<!-- Dropdown Menu -->
			<div
				class="absolute top-full right-0 z-50 mt-1.5 flex max-h-80 w-64 flex-col overflow-y-auto rounded-lg border border-[#EAEAEA] bg-white p-1.5 shadow-lg"
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
							onclick={() => selectModel(model)}
							class="flex items-center justify-between rounded px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-[#F7F6F3] {chatStore
								.selectedModel.model === model.model
								? 'bg-[#EDF3EC] font-medium text-[#111111]'
								: 'text-[#111111]'}"
						>
							<div class="flex flex-col">
								<span>{model.displayName}</span>
								{#if model.capabilities.thinking}
									<span class="text-[10px] text-[#787774]">Reasoning supported</span>
								{/if}
							</div>
							{#if chatStore.selectedModel.model === model.model}
								<Check size={12} weight="bold" class="text-[#1F6C9F]" />
							{/if}
						</button>
					{/each}
				{/if}

				<!-- Groq Section -->
				{#if groqModels.length > 0}
					<div class="my-1 border-t border-[#EAEAEA]"></div>
					<div class="px-2 py-1 text-[10px] font-semibold tracking-wider text-[#956400] uppercase">
						Groq LPU (Ultra Fast)
					</div>
					{#each groqModels as model (model.model)}
						<button
							type="button"
							onclick={() => selectModel(model)}
							class="flex items-center justify-between rounded px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-[#F7F6F3] {chatStore
								.selectedModel.model === model.model
								? 'bg-[#EDF3EC] font-medium text-[#111111]'
								: 'text-[#111111]'}"
						>
							<span>{model.displayName}</span>
							{#if chatStore.selectedModel.model === model.model}
								<Check size={12} weight="bold" class="text-[#956400]" />
							{/if}
						</button>
					{/each}
				{/if}
			</div>

			<!-- Backdrop to close -->
			<div class="fixed inset-0 z-40" onclick={() => (open = false)} role="presentation"></div>
		{/if}
	</div>

	<!-- Thinking Level Selector (only rendered if model has thinking capability) -->
	{#if chatStore.selectedModel.capabilities.thinking}
		<div class="relative">
			<button
				type="button"
				onclick={() => (thinkingOpen = !thinkingOpen)}
				class="flex items-center gap-1 rounded border border-[#EAEAEA] bg-[#F9F9F8] px-1.5 py-1 text-[11px] font-medium text-[#111111] transition-colors hover:border-[#111111]"
				title="Atur Thinking Level"
				aria-label="Atur Thinking Level"
			>
				<Brain
					size={12}
					weight="bold"
					class={chatStore.thinkingLevel === 'off' ? 'text-[#787774]' : 'text-[#8423BF]'}
				/>
				<span class="font-mono text-[10px] capitalize">{chatStore.thinkingLevel}</span>
				<CaretDown size={8} weight="bold" class="text-[#787774]" />
			</button>

			{#if thinkingOpen}
				<div
					class="absolute top-full right-0 z-50 mt-1.5 flex w-28 flex-col rounded-lg border border-[#EAEAEA] bg-white p-1 shadow-lg"
				>
					<div class="px-2 py-0.5 text-[9px] font-semibold tracking-wider text-[#787774] uppercase">
						Thinking
					</div>
					{#each availableThinkingLevels as level}
						<button
							type="button"
							onclick={() => {
								chatStore.setThinkingLevel(level);
								thinkingOpen = false;
							}}
							class="flex items-center justify-between rounded px-2 py-1 text-left text-[11px] transition-colors hover:bg-[#F7F6F3] {chatStore.thinkingLevel ===
							level
								? 'bg-[#FBF3DB] font-medium text-[#8423BF]'
								: 'text-[#111111]'}"
						>
							<span class="capitalize">{level}</span>
							{#if chatStore.thinkingLevel === level}
								<Check size={10} weight="bold" class="text-[#8423BF]" />
							{/if}
						</button>
					{/each}
				</div>

				<div
					class="fixed inset-0 z-40"
					onclick={() => (thinkingOpen = false)}
					role="presentation"
				></div>
			{/if}
		</div>
	{/if}
</div>
