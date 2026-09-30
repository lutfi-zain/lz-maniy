<script lang="ts">
	import { ArrowRight } from 'phosphor-svelte';
	let { command }: { command: { type: string; command: string; message: string } } = $props();
</script>

<div class="flex items-center gap-2 text-[12px]">
	<ArrowRight size={12} weight="bold" class="shrink-0 text-[#787774]" />
	<span class="text-[#787774]">{command.message}</span>
</div>
