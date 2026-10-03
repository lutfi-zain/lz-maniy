<script lang="ts">
	import { chatStore } from '$lib/stores/chat.svelte.js';

	const percent = $derived(
		chatStore.contextUsage ? Math.round(chatStore.contextUsage.percentUsed * 100) : null
	);

	const isHigh = $derived(percent !== null && percent >= 70 && percent < 90);
	const isCritical = $derived(percent !== null && percent >= 90);
</script>

{#if percent !== null}
	<div
		class="inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-medium transition-colors
			{isCritical
				? 'border-[#FDEBEC] bg-[#FDEBEC] text-[#C23934]'
				: isHigh
					? 'border-[#FBF3DB] bg-[#FBF3DB] text-[#8C6D1F]'
					: 'border-[#EAEAEA] bg-[#FAFAFA] text-[#555555]'}"
		title="Kapasitas context window yang terpakai"
	>
		<div class="h-1.5 w-8 overflow-hidden rounded-full bg-[#EAEAEA]">
			<div
				class="h-full transition-all duration-300
					{isCritical ? 'bg-[#C23934]' : isHigh ? 'bg-[#D99B26]' : 'bg-[#111111]'}"
				style="width: {Math.min(100, Math.max(0, percent))}%"
			></div>
		</div>
		<span>{percent}%</span>
	</div>
{/if}
